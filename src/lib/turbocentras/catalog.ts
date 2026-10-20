// Advanced catalog sync: a searchable copy of the whole Turbocentras catalog.
// Every turbocharger (with all OEM/brand numbers and the parts that fit it) and
// every turbo part (with its alternative numbers and the turbos it fits).
// Stored in catalog_turbos / catalog_parts (see supabase/catalog-search.sql).
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { api, cdata, records, nameTable } from "./api";
import { fullByIds, assocItems } from "./specs";
import { normaliseNumber } from "@/lib/catalog/search";

type NumberEntry = { t: string; n: string };
type TurboPart = { type: string; ref: string; pid: string | null };

type TurboRow = {
  id: number; brand: string | null; series: string | null; model: string | null; reference: string | null;
  numbers: NumberEntry[]; parts: TurboPart[]; product_id: string | null; search: string; updated_at: string;
};
type PartRow = {
  id: number; reference: string; type: string | null; brand: string | null;
  numbers: NumberEntry[]; turbo_ids: number[]; product_id: string | null; search: string; updated_at: string;
};

// "Fake, Invalid, Misspelled" numbers: still searchable, never shown.
const HIDDEN_NUMBER_TYPES = new Set(["FIM"]);
const WRITE_BATCH = 1000;

function searchText(values: (string | null | undefined)[]) {
  return [...new Set(values.map(v => normaliseNumber(v ?? "")).filter(v => v.length >= 2))].join(" ");
}

export async function syncCatalog(supabase: SupabaseClient, opts: { dryRun?: boolean } = {}) {
  const startedAt = new Date().toISOString();

  const [brands, partTypes, numberTypes] = await Promise.all([
    (async () => {
      const m: Record<string, string> = {};
      for (const b of records(await api("manufacturers?display=%5Bid,name%5D"), "manufacturer")) m[cdata(b, "id")] = cdata(b, "name");
      return m;
    })(),
    nameTable("turboparttypes", "turboparttype"),
    nameTable("turbochargernumbertypes", "turbochargernumbertype"),
  ]);

  // Our own products, so rows only link to product pages that exist.
  const ourProducts = new Set(
    (await fetchAll<{ id: string }>((f, t) => supabase.from("products").select("id").order("id").range(f, t)))
      .map(p => String(p.id)),
  );
  const ourProduct = (id: string) => (id && id !== "0" && ourProducts.has(id) ? id : null);

  // 1. All turbochargers (one request) and all their numbers (one request)
  const turbos = new Map<number, TurboRow>();
  for (const b of records(await api("turbochargers?display=%5Bid,id_brand,series,reference,model,active,id_product%5D&limit=0,1000000"), "turbocharger")) {
    if (cdata(b, "active") === "0") continue;
    const id = Number(cdata(b, "id"));
    turbos.set(id, {
      id,
      brand: brands[cdata(b, "id_brand")] || null,
      series: cdata(b, "series") || null,
      model: cdata(b, "model") || null,
      reference: cdata(b, "reference") || null,
      numbers: [],
      parts: [],
      product_id: ourProduct(cdata(b, "id_product")),
      search: "",
      updated_at: startedAt,
    });
  }

  const searchNumbers = new Map<number, string[]>();
  for (const b of records(await api("turbochargernumbers?display=%5Bid,number,id_turbo_number_type,id_turbo%5D&limit=0,1000000"), "turbochargernumber")) {
    const turbo = turbos.get(Number(cdata(b, "id_turbo")));
    const n = cdata(b, "number");
    if (!turbo || !n) continue;
    const t = numberTypes[cdata(b, "id_turbo_number_type")] ?? "Ref";
    if (!HIDDEN_NUMBER_TYPES.has(t)) turbo.numbers.push({ t, n });
    const list = searchNumbers.get(turbo.id) ?? [];
    list.push(n);
    searchNumbers.set(turbo.id, list);
  }

  // 2. All turbo parts, with their numbers and the turbos they fit (full records)
  const partIds: string[] = [];
  for (const b of records(await api("turboparts?display=%5Bid,active%5D&limit=0,100000"), "turbopart")) {
    if (cdata(b, "active") !== "0") partIds.push(cdata(b, "id"));
  }
  const parts: PartRow[] = [];
  for (const b of await fullByIds("turboparts", "turbopart", partIds)) {
    const reference = cdata(b, "reference");
    if (!reference) continue;
    const type = partTypes[cdata(b, "id_part_type")] ?? null;
    const productId = ourProduct(cdata(b, "id_product"));
    const numbers = assocItems(b, "turbopartnumbers", "turbopartnumbernumber")
      .map(n => ({ t: numberTypes[cdata(n, "type")] ?? "Ref", n: cdata(n, "number") }))
      .filter(n => n.n && n.n.toUpperCase() !== reference.toUpperCase() && !HIDDEN_NUMBER_TYPES.has(n.t));
    const turboIds = [...new Set(assocItems(b, "turbochargers", "turbocharger").map(t => Number(cdata(t, "id"))))]
      .filter(id => turbos.has(id));

    for (const id of turboIds) turbos.get(id)!.parts.push({ type: type ?? "Part", ref: reference, pid: productId });

    parts.push({
      id: Number(cdata(b, "id")),
      reference,
      type,
      brand: brands[cdata(b, "id_brand")] || null,
      numbers,
      turbo_ids: turboIds,
      product_id: productId,
      search: searchText([reference, ...numbers.map(n => n.n)]),
      updated_at: startedAt,
    });
  }

  for (const turbo of turbos.values()) {
    turbo.search = searchText([turbo.reference, turbo.model, ...(searchNumbers.get(turbo.id) ?? [])]);
    turbo.parts.sort((a, b) => a.type.localeCompare(b.type) || a.ref.localeCompare(b.ref));
  }

  const turboRows = [...turbos.values()];
  const summary = {
    turbos: turboRows.length,
    turbosWithParts: turboRows.filter(t => t.parts.length > 0).length,
    numbers: [...searchNumbers.values()].reduce((s, l) => s + l.length, 0),
    parts: parts.length,
  };
  if (opts.dryRun) return { dryRun: true, ...summary, sampleTurbo: turboRows.find(t => t.parts.length > 2), samplePart: parts[0] };

  // 3. Write, then remove rows that no longer exist at Turbocentras
  for (let i = 0; i < turboRows.length; i += WRITE_BATCH) {
    const { error } = await supabase.from("catalog_turbos").upsert(turboRows.slice(i, i + WRITE_BATCH), { onConflict: "id" });
    if (error) throw new Error(`catalog_turbos upsert failed: ${error.message}`);
  }
  for (let i = 0; i < parts.length; i += WRITE_BATCH) {
    const { error } = await supabase.from("catalog_parts").upsert(parts.slice(i, i + WRITE_BATCH), { onConflict: "id" });
    if (error) throw new Error(`catalog_parts upsert failed: ${error.message}`);
  }
  // Only clean up after a complete run, so a partial API answer can't empty the catalog.
  if (turboRows.length > 1000 && parts.length > 500) {
    await supabase.from("catalog_turbos").delete().lt("updated_at", startedAt);
    await supabase.from("catalog_parts").delete().lt("updated_at", startedAt);
  }

  return summary;
}
