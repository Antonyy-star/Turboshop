// Daily Turbocentras -> Supabase product sync, run by /api/cron/product-sync.
// Same rules as scripts/sync-turbocentras.mjs:
//  - imports/updates every active product, never deletes
//  - never touches badge, original_price or specs
//  - keeps mirrored Supabase image URLs; mirrors new images into Supabase Storage (as WebP)
//  - discontinued products already in the shop are kept but marked out of stock
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { authHeader } from "./api";
import { compressProductImage, PRODUCT_IMAGE_EXT, PRODUCT_IMAGE_TYPE } from "@/lib/images/compress";

const API_BASE = "https://turbocentras.com/api";
const API_UA = "PsWs TurboTeknik";
const EUR_TO_SEK = 11.5;
const PAGE_SIZE = 50;
const BUCKET = "product-images";
const ROOT_CATEGORY_IDS = new Set(["1", "2"]);
const SECTION_CATEGORY_IDS = ["6", "103"]; // "Turbocharger tuning", "Injectors"

const auth = authHeader;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function api(path: string): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${API_BASE}/${path}`, {
      headers: { Authorization: auth(), "User-Agent": API_UA },
      cache: "no-store",
    });
    if (res.ok) return res.text();
    if (res.status === 401 || res.status === 403) throw new Error(`Turbocentras refused access (${res.status})`);
    await sleep(3000 * attempt);
  }
  throw new Error(`Turbocentras API failed: ${path.slice(0, 80)}`);
}

const cdata = (block: string, tag: string) =>
  block.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`))?.[1]?.trim() ?? "";
const lang = (block: string, tag: string) => {
  const inner = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? "";
  return (inner.match(/<language id="1"[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1]
    ?? inner.match(/<language[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? "").trim();
};
const tcImageUrl = (imageId: string) =>
  `https://turbocentras.com/img/p/${imageId.split("").join("/")}/${imageId}-large_default.jpg`;
function imageIdFromUrl(u: string): string | null {
  return u.match(/\/products\/\d+\/(\d+)\.\w+$/)?.[1] ?? u.match(/\/(\d+)-(?:large|thickbox)_default[/.]/)?.[1] ?? null;
}

type Row = { id: string; name: string; brand: string | null; category: string | null; price: number; sku: string | null; images: string[] | null; description: string | null; in_stock: boolean };

export async function syncProducts(supabase: SupabaseClient, opts: { maxImagesToMirror?: number; deadline?: number } = {}) {
  const deadline = opts.deadline ?? Date.now() + 240_000;

  // Lookups
  const categories: Record<string, { name: string; depth: number }> = {};
  for (const [, b] of (await api("categories?display=%5Bid,level_depth,name%5D")).matchAll(/<category>([\s\S]*?)<\/category>/g)) {
    categories[cdata(b, "id")] = { name: lang(b, "name"), depth: parseInt(cdata(b, "level_depth") || "0", 10) };
  }
  const manufacturers: Record<string, string> = {};
  for (const [, b] of (await api("manufacturers?display=%5Bid,name%5D")).matchAll(/<manufacturer>([\s\S]*?)<\/manufacturer>/g)) {
    manufacturers[cdata(b, "id")] = cdata(b, "name");
  }
  const stock = new Map<string, boolean>();
  for (const [, b] of (await api("stock_availables?display=%5Bid_product,id_product_attribute,quantity%5D")).matchAll(/<stock_available>([\s\S]*?)<\/stock_available>/g)) {
    if (cdata(b, "id_product_attribute") === "0") stock.set(cdata(b, "id_product"), parseInt(cdata(b, "quantity") || "0", 10) > 0);
  }

  const existingRows = await fetchAll<Row>((f, t) =>
    supabase.from("products").select("id,name,brand,category,price,sku,images,description,in_stock").order("id").range(f, t));
  const existing = new Map(existingRows.map(r => [String(r.id), r]));

  // Don't use filter[active]=1: the Turbocentras API drops ~1,100 active products from it.
  const idXml = await api("products?display=%5Bid,active%5D");
  const activeIds: string[] = [];
  const inactiveInShop = new Set<string>();
  for (const m of idXml.matchAll(/<id><!\[CDATA\[(\d+)\]\]><\/id>\s*<active><!\[CDATA\[(\d)\]\]><\/active>/g)) {
    if (m[2] === "1") activeIds.push(m[1]);
    else if (existing.has(m[1])) inactiveInShop.add(m[1]);
  }
  if (activeIds.length < 1000) throw new Error(`Only ${activeIds.length} active products found; refusing to continue`);
  const ids = [...activeIds, ...inactiveInShop];

  const writes: Row[] = [];
  let added = 0;
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    if (Date.now() > deadline) throw new Error(`Time limit reached after ${i} products; nothing written`);
    const batch = ids.slice(i, i + PAGE_SIZE);
    const xml = await api(`products?display=full&filter%5Bid%5D=%5B${batch.join("%7C")}%5D`);
    // Top-level products start with <product><id><![CDATA[...; nested accessory refs use <id xlink:href=...>
    const blocks = xml.split(/<product>\s*(?=<id><!\[CDATA\[)/).slice(1);
    for (const b of blocks) {
      const id = cdata(b, "id");
      if (!id) continue;
      const sku = cdata(b, "reference") || null;
      const name = lang(b, "name") || sku || `Product ${id}`;
      const brand = cdata(b, "manufacturer_name") || manufacturers[cdata(b, "id_manufacturer")] || "Okänt";

      let catId = cdata(b, "id_category_default");
      const catBlock = b.match(/<categories[^>]*>([\s\S]*?)<\/categories>/)?.[1] ?? "";
      const assoc = [...catBlock.matchAll(/<id><!\[CDATA\[(\d+)\]\]><\/id>/g)].map(m => m[1]);
      // Shop sections (Tuning, Injectors) win over the part type, so those pages keep their products
      const section = SECTION_CATEGORY_IDS.find(s => assoc.includes(s) || catId === s);
      if (section) catId = section;
      else if (!categories[catId] || ROOT_CATEGORY_IDS.has(catId)) {
        const best = assoc.filter(c => categories[c] && !ROOT_CATEGORY_IDS.has(c)).sort((a, z) => categories[z].depth - categories[a].depth)[0];
        if (best) catId = best;
      }
      const category = categories[catId] && !ROOT_CATEGORY_IDS.has(catId) ? categories[catId].name : null;

      const priceEur = parseFloat(cdata(b, "price") || "0");
      const price = priceEur > 0 ? Math.max(1, Math.round(priceEur * EUR_TO_SEK)) : 0;
      const description = lang(b, "description_short") || lang(b, "description") || null;
      // Products Turbocentras doesn't sell (no price / not orderable) are shown as out of stock
      const orderable = cdata(b, "available_for_order") !== "0" && cdata(b, "show_price") !== "0";
      const inStock = inactiveInShop.has(id) || !orderable ? false : stock.get(id) ?? existing.get(id)?.in_stock ?? false;

      const imgBlock = b.match(/<images[^>]*>([\s\S]*?)<\/images>/)?.[1] ?? "";
      const tcImageIds = [...imgBlock.matchAll(/<id><!\[CDATA\[(\d+)\]\]><\/id>/g)].map(m => m[1]);

      const old = existing.get(id);
      const oldById = new Map((old?.images ?? []).map(u => [imageIdFromUrl(u), u]));
      const mirrored = (old?.images ?? []).filter(u => u.includes("supabase.co"));
      const images = tcImageIds.length === 0 && mirrored.length > 0 ? mirrored : tcImageIds.map(x => oldById.get(x) ?? tcImageUrl(x));

      const row: Row = {
        id, name, brand, category: category ?? old?.category ?? null, price: price || old?.price || 0, sku, images,
        description: description ?? old?.description ?? null, in_stock: inStock,
      };
      if (!old) { added++; writes.push(row); continue; }
      const changed = (["name", "brand", "category", "price", "sku", "description", "in_stock"] as const)
        .some(k => String(old[k] ?? "") !== String(row[k] ?? "")) || JSON.stringify(old.images ?? []) !== JSON.stringify(images);
      if (changed) writes.push(row);
    }
    await sleep(300);
  }

  for (let i = 0; i < writes.length; i += 200) {
    const { error } = await supabase.from("products").upsert(writes.slice(i, i + 200), { onConflict: "id" });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  const mirroredCount = await mirrorImages(supabase, writes, opts.maxImagesToMirror ?? 150, deadline);
  return { active: activeIds.length, discontinuedInShop: inactiveInShop.size, added, updated: writes.length - added, imagesMirrored: mirroredCount };
}

// Copies Turbocentras images into Supabase Storage and points the product at the copy
async function mirrorImages(supabase: SupabaseClient, rows: Row[], max: number, deadline: number) {
  let count = 0;
  for (const row of rows) {
    const imgs = row.images ?? [];
    if (!imgs.some(u => u.includes("turbocentras.com"))) continue;
    const next: string[] = [];
    for (const u of imgs) {
      const imageId = imageIdFromUrl(u);
      if (!u.includes("turbocentras.com") || !imageId || count >= max || Date.now() > deadline) { next.push(u); continue; }
      try {
        const res = await fetch(`${API_BASE}/images/products/${row.id}/${imageId}`, {
          headers: { Authorization: auth(), "User-Agent": API_UA }, cache: "no-store",
        });
        if (!res.ok) { next.push(u); continue; }
        const path = `products/${row.id}/${imageId}.${PRODUCT_IMAGE_EXT}`;
        const image = await compressProductImage(Buffer.from(await res.arrayBuffer()));
        const { error } = await supabase.storage.from(BUCKET).upload(path, image, {
          contentType: PRODUCT_IMAGE_TYPE, upsert: true, cacheControl: "31536000",
        });
        if (error) { next.push(u); continue; }
        next.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
        count++;
      } catch {
        next.push(u);
      }
    }
    if (JSON.stringify(next) !== JSON.stringify(imgs)) {
      await supabase.from("products").update({ images: next }).eq("id", row.id);
    }
  }
  return count;
}
