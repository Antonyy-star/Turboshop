import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const PRODUCTS_PER_RUN = 30; // check 30 individual product pages per cron hit

// Maps DB category → turbocentras URL path segment
const CATEGORY_PATH: Record<string, string> = {
  Turboladdare:  "turbochargers",
  CHRA:          "core-assemblies",
  Turbodelar:    "turbocharger-parts",
  Utrustning:    "turbocharger-repair-equipment",
  Tuning:        "turbocharger-tuning",
};

// Realistic browser headers to avoid bot detection
const HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "lt-LT,lt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function buildProductUrl(id: number | string, name: string, category: string | null): string {
  const categoryPath = CATEGORY_PATH[category ?? "Turboladdare"] ?? "turbochargers";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `https://www.turbocentras.com/en/${categoryPath}/${id}-${slug}`;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseStockStatus(html: string): boolean {
  const lower = html.toLowerCase();

  // Out of stock — schema.org markup is most reliable
  if (
    lower.includes('"availability":"http://schema.org/outofstock"') ||
    lower.includes('"availability": "http://schema.org/outofstock"') ||
    lower.includes("outofstock") ||
    lower.includes("out-of-stock") ||
    lower.includes("product-unavailable")
  ) return false;

  // In stock
  if (
    lower.includes('"availability":"http://schema.org/instock"') ||
    lower.includes('"availability": "http://schema.org/instock"') ||
    lower.includes('data-button-action="add-to-cart"') ||
    lower.includes("add to cart") ||
    lower.includes("instock")
  ) return true;

  // Default: assume in stock if page loaded but no clear signal
  return true;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Read cursor
  const { data: cursorRow } = await supabase
    .from("cron_state")
    .select("value")
    .eq("key", "stock_check_cursor")
    .single();

  let productIndex = 0;
  try { productIndex = parseInt(cursorRow?.value ?? "0") || 0; } catch {}

  // Fetch next batch of products
  const { data: products, error: fetchErr } = await supabase
    .from("products")
    .select("id, name, brand, sku, category, in_stock")
    .order("id", { ascending: true })
    .range(productIndex, productIndex + PRODUCTS_PER_RUN - 1);

  if (fetchErr || !products || products.length === 0) {
    // Wrapped around — reset cursor
    await supabase.from("cron_state").upsert({
      key: "stock_check_cursor",
      value: "0",
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    return NextResponse.json({ message: "Wrapped cursor to 0", checked: 0, changed: 0 });
  }

  const changes: { sku: string; name: string; old: boolean; new: boolean }[] = [];
  let checked = 0;
  let failed = 0;

  for (const product of products) {
    const url = buildProductUrl(product.id, product.name, product.category);
    const html = await fetchPage(url);

    if (!html) { failed++; continue; }

    const inStock = parseStockStatus(html);
    const oldStatus = product.in_stock ?? true;
    checked++;

    if (inStock !== oldStatus) {
      await supabase.from("products").update({ in_stock: inStock }).eq("id", product.id);
      await supabase.from("stock_events").insert({
        product_id: String(product.id),
        sku: product.sku,
        product_name: product.name,
        brand: product.brand ?? "",
        old_status: oldStatus,
        new_status: inStock,
      });
      changes.push({ sku: product.sku, name: product.name, old: oldStatus, new: inStock });
    }
  }

  // Advance cursor (wrap to 0 when finished all products)
  const nextIndex = products.length < PRODUCTS_PER_RUN ? 0 : productIndex + PRODUCTS_PER_RUN;
  await supabase.from("cron_state").upsert({
    key: "stock_check_cursor",
    value: String(nextIndex),
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });

  return NextResponse.json({
    checked,
    failed,
    changed: changes.length,
    changes,
    nextIndex,
    wrapping: nextIndex === 0,
  });
}
