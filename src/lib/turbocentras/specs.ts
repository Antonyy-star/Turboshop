// Technical specs sync from the Turbocentras API (no website scraping).
// Turbochargers -> series, model, all OEM/brand numbers, compatible parts.
// Turbo parts   -> their own numbers, part properties, and every turbo they fit.
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { api, cdata, lang, records, nameTable } from "./api";

type Specs = Record<string, unknown> & {
  series?: string | null; model?: string | null; reference?: string | null;
  turbo_numbers?: { type: string; number: string }[];
  turbo_parts?: { type: string; sku: string }[];
  used_in?: string[];
  features?: string[];
  source?: string;
};

const CHUNK = 250;

async function pagedList(resource: string, tag: string, display: string, extraFilter = "") {
  const out: string[] = [];
  for (let offset = 0; ; offset += CHUNK) {
    const xml = await api(`${resource}?display=${display}${extraFilter}&limit=${offset},${CHUNK}`);
    const recs = records(xml, tag);
    out.push(...recs);
    if (recs.length < CHUNK) break;
  }
  return out;
}

// Full records by id. Needed because paged (limit=) full listings come back with EMPTY associations.
export async function fullByIds(resource: string, tag: string, ids: string[], batch = 80) {
  const out: string[] = [];
  for (let i = 0; i < ids.length; i += batch) {
    const xml = await api(`${resource}?display=full&filter%5Bid%5D=%5B${ids.slice(i, i + batch).join("%7C")}%5D`);
    out.push(...records(xml, tag));
  }
  return out;
}

export const assocItems = (block: string, wrapper: string, item: string) => {
  const inner = block.match(new RegExp(`<${wrapper}[^>]*>([\\s\\S]*?)</${wrapper}>`))?.[1] ?? "";
  // Items carry xlink:href attributes, e.g. <turbocharger xlink:href="...">
  return [...inner.matchAll(new RegExp(`<${item}(?:\\s[^>]*)?>([\\s\\S]*?)</${item}>`, "g"))].map(m => m[1]);
};

export async function syncSpecs(supabase: SupabaseClient, opts: { dryRun?: boolean } = {}) {
  // Lookup tables
  const [numberTypes, partTypes, brands, propNames] = await Promise.all([
    nameTable("turbochargernumbertypes", "turbochargernumbertype"),
    nameTable("turboparttypes", "turboparttype"),
    (async () => {
      const m: Record<string, string> = {};
      for (const b of records(await api("manufacturers?display=%5Bid,name%5D"), "manufacturer")) m[cdata(b, "id")] = cdata(b, "name");
      return m;
    })(),
    nameTable("turbopartproperties", "turbopartproperty"),
  ]);
  const propValues: Record<string, string> = {};
  for (const b of await pagedList("turbopartpropertyvalues", "turbopartpropertyvalue", "full")) {
    propValues[cdata(b, "id")] = lang(b, "value");
  }

  // Every turbocharger, light: needed to describe which turbos a part fits
  const turboInfo: Record<string, string> = {};
  const turboIdsInShop: string[] = [];
  for (const b of await pagedList("turbochargers", "turbocharger", "%5Bid,id_brand,reference,model,active,id_product%5D")) {
    if (cdata(b, "active") === "0") continue;
    turboInfo[cdata(b, "id")] = [brands[cdata(b, "id_brand")], cdata(b, "reference"), cdata(b, "model")].filter(Boolean).join(" ");
    const pid = cdata(b, "id_product");
    if (pid && pid !== "0") turboIdsInShop.push(cdata(b, "id"));
  }
  const partIdsInShop: string[] = [];
  for (const b of await pagedList("turboparts", "turbopart", "%5Bid,id_product,active%5D")) {
    const pid = cdata(b, "id_product");
    if (pid && pid !== "0" && cdata(b, "active") !== "0") partIdsInShop.push(cdata(b, "id"));
  }

  const specsByProduct = new Map<string, Specs>();

  // Turbochargers that are shop products
  for (const b of await fullByIds("turbochargers", "turbocharger", turboIdsInShop)) {
    const productId = cdata(b, "id_product");
    if (!productId || productId === "0") continue;
    const numbers = assocItems(b, "turbochargernumbers", "turbochargernumber")
      .map(n => ({ type: numberTypes[cdata(n, "type")] ?? "Ref", number: cdata(n, "number") }))
      .filter(n => n.number);
    const parts = assocItems(b, "turboparts", "turbopart")
      .map(p => ({ type: partTypes[cdata(p, "type")] ?? "Part", sku: cdata(p, "reference") }))
      .filter(p => p.sku);
    specsByProduct.set(productId, {
      series: cdata(b, "series") || null,
      model: cdata(b, "model") || null,
      reference: cdata(b, "reference") || null,
      turbo_numbers: numbers,
      turbo_parts: parts,
    });
  }

  // Turbo parts that are shop products
  for (const b of await fullByIds("turboparts", "turbopart", partIdsInShop)) {
    const productId = cdata(b, "id_product");
    if (!productId || productId === "0") continue;
    const numbers = assocItems(b, "turbopartnumbers", "turbopartnumbernumber")
      .map(n => ({ type: numberTypes[cdata(n, "type")] ?? "Ref", number: cdata(n, "number") }))
      .filter(n => n.number);
    const usedIn = [...new Set(assocItems(b, "turbochargers", "turbocharger")
      .map(t => turboInfo[cdata(t, "id")]).filter(Boolean))];
    const features = assocItems(b, "turbopartproperties", "turbopartproperty")
      .map(p => {
        const name = propNames[cdata(p, "id")];
        const value = propValues[cdata(p, "id_part_property_value")];
        return name && value ? `${name}: ${value}` : null;
      })
      .filter((f): f is string => !!f);
    specsByProduct.set(productId, {
      ...(specsByProduct.get(productId) ?? {}),
      reference: cdata(b, "reference") || null,
      turbo_numbers: numbers,
      used_in: usedIn,
      features,
    });
  }

  // Merge into existing specs (keeps scraped-only fields such as technology/actuation/replacements)
  // name/brand/price are re-sent unchanged only because upsert must satisfy the NOT NULL columns
  type Existing = { id: string; name: string; brand: string; price: number; specs: Specs | null };
  const existing = await fetchAll<Existing>((f, t) =>
    supabase.from("products").select("id,name,brand,price,specs").order("id").range(f, t));
  const writes: (Omit<Existing, "specs"> & { specs: Specs })[] = [];
  for (const row of existing) {
    const fresh = specsByProduct.get(String(row.id));
    if (!fresh) continue;
    const merged: Specs = { ...(row.specs ?? {}), ...fresh, source: "turbocentras-api" };
    if (JSON.stringify(merged) !== JSON.stringify(row.specs)) {
      writes.push({ id: row.id, name: row.name, brand: row.brand, price: row.price, specs: merged });
    }
  }
  if (opts.dryRun) {
    return { dryRun: true, productsWithSpecs: specsByProduct.size, wouldUpdate: writes.length, samples: writes.slice(0, 3).map(w => ({ id: w.id, specs: w.specs })) };
  }
  for (let i = 0; i < writes.length; i += 200) {
    const { error } = await supabase.from("products").upsert(writes.slice(i, i + 200), { onConflict: "id" });
    if (error) throw new Error(`Supabase specs upsert failed: ${error.message}`);
  }

  return { turbochargersInShop: [...specsByProduct.values()].filter(s => s.series !== undefined).length, productsWithSpecs: specsByProduct.size, updated: writes.length };
}
