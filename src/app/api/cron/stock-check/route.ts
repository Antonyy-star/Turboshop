import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { load } from "cheerio";

const CATEGORIES = [
  "https://www.turbocentras.com/en/3-turbochargers",
  "https://www.turbocentras.com/en/9-core-assemblies",
  "https://www.turbocentras.com/en/4-turbocharger-parts",
];

const PAGES_PER_RUN = 3; // 3 pages × 24 products = 72 products checked per run

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseListing(html: string): { products: Array<{ sku: string; inStock: boolean }>; hasMore: boolean } {
  const $ = load(html);
  const products: Array<{ sku: string; inStock: boolean }> = [];

  $("article.product-miniature").each((_, el) => {
    const $el = $(el);
    const sku = $el.find(".product-reference a").text().trim().replace(/^#/, "");
    if (!sku) return;
    const flagsText = $el.find(".product-flags").text().toLowerCase();
    const inStock = !flagsText.includes("out-of-stock") && !flagsText.includes("out of stock");
    products.push({ sku, inStock });
  });

  // Check if there's a next page link
  const hasMore = products.length >= 24;

  return { products, hasMore };
}

export async function GET(req: NextRequest) {
  // Verify cron secret
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

  let cursor = { categoryIndex: 0, page: 1 };
  try {
    cursor = JSON.parse(cursorRow?.value ?? "{}");
    if (!cursor.categoryIndex) cursor.categoryIndex = 0;
    if (!cursor.page) cursor.page = 1;
  } catch {}

  let { categoryIndex, page } = cursor;
  const scrapedProducts: Array<{ sku: string; inStock: boolean }> = [];

  // Scrape PAGES_PER_RUN pages
  for (let i = 0; i < PAGES_PER_RUN; i++) {
    const url = page === 1
      ? CATEGORIES[categoryIndex]
      : `${CATEGORIES[categoryIndex]}?page=${page}`;

    const html = await fetchPage(url);
    if (!html) {
      // Skip this page, advance
      page++;
      continue;
    }

    const { products, hasMore } = parseListing(html);
    scrapedProducts.push(...products);

    if (!hasMore || products.length === 0) {
      // End of category — move to next
      categoryIndex = (categoryIndex + 1) % CATEGORIES.length;
      page = 1;
    } else {
      page++;
    }
  }

  if (scrapedProducts.length === 0) {
    await supabase.from("cron_state").upsert({
      key: "stock_check_cursor",
      value: JSON.stringify({ categoryIndex, page }),
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ checked: 0, changed: 0, cursor: { categoryIndex, page } });
  }

  // Look up DB products by SKU
  const skus = [...new Set(scrapedProducts.map(p => p.sku).filter(Boolean))];
  const { data: dbProducts } = await supabase
    .from("products")
    .select("id, sku, name, brand, in_stock")
    .in("sku", skus);

  if (!dbProducts || dbProducts.length === 0) {
    await supabase.from("cron_state").upsert({
      key: "stock_check_cursor",
      value: JSON.stringify({ categoryIndex, page }),
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ checked: scrapedProducts.length, changed: 0, cursor: { categoryIndex, page } });
  }

  // Build sku → db product map
  const skuMap: Record<string, { id: string; name: string; brand: string; in_stock: boolean }> = {};
  for (const p of dbProducts) {
    if (p.sku) skuMap[p.sku] = p;
  }

  // Find changed products
  const changes: Array<{
    product_id: string; sku: string; product_name: string; brand: string;
    old_status: boolean; new_status: boolean;
  }> = [];

  for (const scraped of scrapedProducts) {
    const db = skuMap[scraped.sku];
    if (!db) continue;
    const oldStatus = db.in_stock ?? true;
    if (scraped.inStock !== oldStatus) {
      changes.push({
        product_id: db.id,
        sku: scraped.sku,
        product_name: db.name,
        brand: db.brand ?? "",
        old_status: oldStatus,
        new_status: scraped.inStock,
      });
    }
  }

  // Apply changes
  if (changes.length > 0) {
    await Promise.all(
      changes.map(ch =>
        supabase.from("products").update({ in_stock: ch.new_status }).eq("id", ch.product_id)
      )
    );
    await supabase.from("stock_events").insert(
      changes.map(ch => ({
        product_id: ch.product_id,
        sku: ch.sku,
        product_name: ch.product_name,
        brand: ch.brand,
        old_status: ch.old_status,
        new_status: ch.new_status,
      }))
    );
  }

  // Save cursor
  await supabase.from("cron_state").upsert({
    key: "stock_check_cursor",
    value: JSON.stringify({ categoryIndex, page }),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({
    checked: scrapedProducts.length,
    changed: changes.length,
    changes: changes.map(c => ({ sku: c.sku, from: c.old_status, to: c.new_status })),
    cursor: { categoryIndex, page },
  });
}
