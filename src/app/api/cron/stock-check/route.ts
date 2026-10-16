import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const API_BASE = "https://turbocentras.com/api";
const API_KEY  = "UE79U7CTUM89HTBDC1NIYLDFSMB97N3I";
const API_UA   = "PsWs TurboTeknik";

async function fetchStockFromApi(): Promise<Map<string, boolean>> {
  const auth = Buffer.from(`${API_KEY}:`).toString("base64");
  const res = await fetch(`${API_BASE}/stock_availables?display=full`, {
    headers: { Authorization: `Basic ${auth}`, "User-Agent": API_UA },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const xml = await res.text();

  const stockMap = new Map<string, boolean>();
  // Match each stock_available block
  const blocks = xml.matchAll(/<stock_available>([\s\S]*?)<\/stock_available>/g);
  for (const [, block] of blocks) {
    const productId = block.match(/<id_product[^>]*>\s*<!\[CDATA\[(\d+)/)?.[1];
    const attr = block.match(/<id_product_attribute[^>]*>\s*<!\[CDATA\[(\d+)/)?.[1];
    const qty  = block.match(/<quantity[^>]*>\s*<!\[CDATA\[(-?\d+)/)?.[1];
    // Only count the base product record (no attribute variant)
    if (productId && attr === "0" && !stockMap.has(productId)) {
      stockMap.set(productId, parseInt(qty ?? "0", 10) > 0);
    }
  }
  return stockMap;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all stock from the PrestaShop API in one call
  let stockMap: Map<string, boolean>;
  try {
    stockMap = await fetchStockFromApi();
  } catch (err) {
    return NextResponse.json({ error: `API fetch failed: ${(err as Error).message}` }, { status: 502 });
  }

  if (stockMap.size === 0) {
    return NextResponse.json({ error: "No stock records returned from API" }, { status: 502 });
  }

  // Read current stock from Supabase to find what actually changed
  const { data: dbProducts } = await supabase
    .from("products")
    .select("id, in_stock, name, sku, brand");

  const changes: { id: string; name: string; old: boolean; new: boolean }[] = [];
  const updates: { id: string; in_stock: boolean }[] = [];

  for (const p of dbProducts ?? []) {
    const apiStock = stockMap.get(String(p.id));
    if (apiStock === undefined) continue; // product not in API response — skip
    if (apiStock !== p.in_stock) {
      changes.push({ id: String(p.id), name: p.name, old: p.in_stock, new: apiStock });
      updates.push({ id: String(p.id), in_stock: apiStock });
    }
  }

  // Batch-update only the changed rows
  if (updates.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < updates.length; i += BATCH) {
      await supabase
        .from("products")
        .upsert(updates.slice(i, i + BATCH), { onConflict: "id" });
    }

    // Log to activity_log
    await supabase.from("activity_log").insert({
      admin_email: "system@turboteknik.se",
      admin_name: "System",
      action_type: "stock_sync",
      entity_type: "products",
      entity_name: `Lagerstatus synkroniserad — ${changes.length} ändringar`,
      metadata: { changed: changes.slice(0, 20), total_checked: stockMap.size },
    });
  }

  return NextResponse.json({
    checked: stockMap.size,
    changed: changes.length,
    changes: changes.slice(0, 20),
  });
}
