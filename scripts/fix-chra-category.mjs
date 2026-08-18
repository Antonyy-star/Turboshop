/**
 * Scrape CHRA listing from turbocentras.com and update those product IDs
 * to category "CHRA" in Supabase. Products in both CHRA and Turbodelar
 * were incorrectly labeled Turbodelar since Turbodelar was scraped last.
 */
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const { createClient } = await import("@supabase/supabase-js");
const { load } = await import("cheerio");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BASE_URL = "https://www.turbocentras.com/en/9-core-assemblies";
const DELAY_MS = 300;

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("Fix CHRA Category\n=================\n");

  // Step 1: Scrape all CHRA listing pages to collect product IDs
  const chraProductIds = new Set();

  console.log("Fetching CHRA listing pages...");
  const firstHtml = await fetchPage(BASE_URL);
  const $first = load(firstHtml);

  // Get total count
  const totalText = $first("span.showing").text();
  const totalMatch = totalText.match(/of\s*([\d,]+)\s*item/i);
  const totalProducts = totalMatch
    ? parseInt(totalMatch[1].replace(/,/g, ""), 10)
    : 0;
  const totalPages = Math.ceil(totalProducts / 24);
  console.log(
    `  Total CHRA products: ${totalProducts} across ${totalPages} pages`
  );

  // Extract from first page
  $first("article.product-miniature").each((_, el) => {
    const id = $first(el).attr("data-id-product");
    if (id) chraProductIds.add(parseInt(id, 10));
  });

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(`${BASE_URL}?page=${page}`);
      const $ = load(html);
      $("article.product-miniature").each((_, el) => {
        const id = $(el).attr("data-id-product");
        if (id) chraProductIds.add(parseInt(id, 10));
      });
      if (page % 10 === 0 || page === totalPages) {
        process.stdout.write(
          `\r  Scraped page ${page}/${totalPages} (${chraProductIds.size} IDs so far)`
        );
      }
    } catch (e) {
      console.error(`\n  Error on page ${page}:`, e.message);
    }
  }
  console.log(`\n  Done. Found ${chraProductIds.size} CHRA product IDs.\n`);

  // Step 2: Update all those IDs to category "CHRA" in Supabase
  const idArray = [...chraProductIds];
  console.log(`Updating ${idArray.length} products to category "CHRA"...`);

  const BATCH = 500;
  let updated = 0;
  for (let i = 0; i < idArray.length; i += BATCH) {
    const batch = idArray.slice(i, i + BATCH);
    const { error, count } = await supabase
      .from("products")
      .update({ category: "CHRA" })
      .in("id", batch);
    if (error) {
      console.error(`  Error on batch ${i}–${i + BATCH}:`, error.message);
    } else {
      updated += batch.length;
      process.stdout.write(`\r  Updated: ${updated}/${idArray.length}`);
    }
  }
  console.log(`\n\n✅ Done! ${updated} products re-categorized to CHRA.`);

  // Verify final counts
  const { count: chraCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category", "CHRA");
  const { count: turboCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category", "Turboladdare");
  const { count: delarCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category", "Turbodelar");

  console.log("\nFinal category counts:");
  console.log(`  Turboladdare: ${turboCount}`);
  console.log(`  CHRA:         ${chraCount}`);
  console.log(`  Turbodelar:   ${delarCount}`);
}

main().catch(console.error);
