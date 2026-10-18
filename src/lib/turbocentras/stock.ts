// Stock sync: makes products.in_stock match Turbocentras exactly, using only the API.
// In stock = quantity > 0 in stock_availables AND product is active, orderable and priced.
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { api, cdata, records } from "./api";

export async function fetchTurbocentrasStock(): Promise<Map<string, boolean>> {
  const [stockXml, productXml] = await Promise.all([
    api("stock_availables?display=%5Bid_product,id_product_attribute,quantity%5D"),
    api("products?display=%5Bid,active,available_for_order,show_price%5D"),
  ]);
  const qty = new Map<string, number>();
  for (const b of stockXml.split("<stock_available>").slice(1)) {
    if (cdata(b, "id_product_attribute") !== "0") continue;
    qty.set(cdata(b, "id_product"), parseInt(cdata(b, "quantity") || "0", 10));
  }
  const result = new Map<string, boolean>();
  for (const b of records(productXml, "product")) {
    const id = cdata(b, "id");
    const sellable = cdata(b, "active") === "1" && cdata(b, "available_for_order") !== "0" && cdata(b, "show_price") !== "0";
    result.set(id, sellable && (qty.get(id) ?? 0) > 0);
  }
  if (result.size < 1000) throw new Error(`Only ${result.size} products returned by Turbocentras; refusing to update stock`);
  return result;
}

export async function syncStock(supabase: SupabaseClient) {
  const tc = await fetchTurbocentrasStock();
  const rows = await fetchAll<{ id: string; in_stock: boolean | null; name: string; sku: string | null; brand: string | null }>((f, t) =>
    supabase.from("products").select("id,in_stock,name,sku,brand").order("id").range(f, t));

  const changes = rows
    .filter(r => tc.has(String(r.id)) && tc.get(String(r.id)) !== (r.in_stock === true))
    .map(r => ({ ...r, id: String(r.id), next: tc.get(String(r.id))! }));

  for (const status of [true, false]) {
    const ids = changes.filter(c => c.next === status).map(c => c.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from("products").update({ in_stock: status }).in("id", ids.slice(i, i + 200));
      if (error) throw new Error(`Supabase stock update failed: ${error.message}`);
    }
  }

  // Live feed on the admin dashboard
  if (changes.length > 0 && changes.length <= 500) {
    await supabase.from("stock_events").insert(changes.map(c => ({
      product_id: c.id, sku: c.sku ?? "", product_name: c.name, brand: c.brand ?? "",
      old_status: c.in_stock === true, new_status: c.next,
    })));
  }
  await supabase.from("cron_state").upsert(
    { key: "stock_check_cursor", value: String(tc.size), updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  return { checked: tc.size, changed: changes.length, changes: changes.slice(0, 20).map(c => ({ id: c.id, sku: c.sku, inStock: c.next })) };
}
