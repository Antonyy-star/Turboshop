#!/usr/bin/env node
/**
 * TurboTeknik Stock Agent — Playwright edition
 *
 * Scrapes turbocentras.com for in-stock / out-of-stock status,
 * compares with your Supabase DB, and writes changes to:
 *   - products.in_stock  (updated live)
 *   - stock_events table (triggers Supabase Realtime → admin dashboard live feed)
 *
 * REQUIRES: Lithuanian VPN active (Windscribe → Lithuania)
 *
 * USAGE — run once manually:
 *   node scripts/stock-agent.mjs
 *
 * USAGE — run every 10 minutes automatically (while VPN is on):
 *   node scripts/stock-agent.mjs --watch
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { chromium } from "../node_modules/playwright/index.mjs";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WATCH_MODE = process.argv.includes("--watch");
const WATCH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Load .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// All categories to scrape
const CATEGORIES = [
  { url: "https://www.turbocentras.com/en/3-turbochargers",    name: "Turbochargers" },
  { url: "https://www.turbocentras.com/en/9-core-assemblies",  name: "Core Assemblies" },
  { url: "https://www.turbocentras.com/en/4-turbocharger-parts", name: "Turbo Parts" },
];

function log(msg) {
  const line = `[${new Date().toLocaleString("sv-SE")}] ${msg}`;
  console.log(line);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeSkuForLookup(sku) {
  return sku.replace(/^#/, "").trim();
}

async function scrapeCategoryPages(context, categoryUrl, categoryName) {
  const allProducts = [];
  let page = 1;

  while (true) {
    const url = page === 1 ? categoryUrl : `${categoryUrl}?page=${page}`;
    log(`  Scraping ${categoryName} page ${page}: ${url}`);

    try {
      const pageObj = await context.newPage();
      await pageObj.goto(url, { timeout: 25000, waitUntil: "domcontentloaded" });
      await pageObj.waitForTimeout(800);

      const products = await pageObj.evaluate(() => {
        const cards = document.querySelectorAll("article.product-miniature");
        return Array.from(cards).map(c => {
          const rawSku = c.querySelector(".product-reference")?.textContent?.trim() ?? "";
          const sku = rawSku.replace(/^#/, "").trim();
          const flagItems = Array.from(c.querySelectorAll(".product-flag")).map(f => f.textContent.toLowerCase().trim());
          const inStock = !flagItems.some(f => f.includes("out") || f.includes("stock") && f.includes("out"));
          return { sku, inStock };
        }).filter(p => p.sku);
      });

      await pageObj.close();

      if (products.length === 0) {
        log(`  No products on page ${page} — end of ${categoryName}`);
        break;
      }

      allProducts.push(...products);
      log(`  Page ${page}: ${products.length} products (${allProducts.length} total)`);

      // Check if there's a next page (assume 24 per page)
      if (products.length < 24) break;
      page++;
      await sleep(1000); // polite delay between pages
    } catch (e) {
      log(`  Error on ${categoryName} page ${page}: ${e.message.slice(0, 100)}`);
      break;
    }
  }

  return allProducts;
}

async function runStockCheck() {
  log("=== Stock check starting ===");

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "lt-LT",
  });

  try {
    // Establish session
    log("Establishing session...");
    const homePage = await context.newPage();
    await homePage.goto("https://www.turbocentras.com/", { timeout: 25000, waitUntil: "domcontentloaded" });
    await homePage.close();
    log("Session ready.");

    // Scrape all categories
    const scraped = new Map(); // sku → inStock
    for (const cat of CATEGORIES) {
      const products = await scrapeCategoryPages(context, cat.url, cat.name);
      for (const p of products) {
        scraped.set(p.sku, p.inStock);
      }
      log(`Category '${cat.name}' done: ${products.length} products`);
      await sleep(2000);
    }

    log(`Total scraped: ${scraped.size} unique SKUs`);

    if (scraped.size === 0) {
      log("Nothing scraped — aborting.");
      return;
    }

    // Look up these SKUs in Supabase
    const skus = [...scraped.keys()];
    const BATCH = 500;
    let dbProducts = [];

    for (let i = 0; i < skus.length; i += BATCH) {
      const batch = skus.slice(i, i + BATCH);
      const { data } = await supabase
        .from("products")
        .select("id, sku, name, brand, in_stock")
        .in("sku", batch);
      dbProducts.push(...(data ?? []));
    }

    log(`Matched ${dbProducts.length} products in DB`);

    // Find changed products
    const changes = [];
    for (const dbP of dbProducts) {
      if (!dbP.sku) continue;
      const scrapedStatus = scraped.get(normalizeSkuForLookup(dbP.sku));
      if (scrapedStatus === undefined) continue;
      const oldStatus = dbP.in_stock ?? true;
      if (scrapedStatus !== oldStatus) {
        changes.push({
          product_id: dbP.id,
          sku: dbP.sku,
          product_name: dbP.name ?? "",
          brand: dbP.brand ?? "",
          old_status: oldStatus,
          new_status: scrapedStatus,
        });
      }
    }

    log(`Stock changes found: ${changes.length}`);

    if (changes.length > 0) {
      // Update in_stock on changed products
      await Promise.all(
        changes.map(ch =>
          supabase.from("products").update({ in_stock: ch.new_status }).eq("id", ch.product_id)
        )
      );

      // Insert stock_events (triggers Realtime → admin dashboard)
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

      log("Changes written to DB + stock_events.");
      for (const ch of changes) {
        const arrow = ch.new_status ? "OUT→IN LAGER" : "IN→SLUT";
        log(`  ${arrow}: ${ch.brand} ${ch.sku} — ${ch.product_name}`);
      }
    }

    // Update cron_state cursor timestamp
    await supabase.from("cron_state").upsert({
      key: "stock_check_cursor",
      value: JSON.stringify({ last_run: new Date().toISOString(), skus_checked: scraped.size }),
      updated_at: new Date().toISOString(),
    });

    log(`=== Done. Checked: ${scraped.size}, Matched: ${dbProducts.length}, Changed: ${changes.length} ===`);

  } finally {
    await browser.close();
  }
}

// Run once or in watch mode
if (WATCH_MODE) {
  log(`Watch mode: running every ${WATCH_INTERVAL_MS / 60000} minutes. Ctrl+C to stop.`);
  while (true) {
    await runStockCheck().catch(e => log(`ERROR: ${e.message}`));
    log(`Next run in ${WATCH_INTERVAL_MS / 60000} minutes...`);
    await sleep(WATCH_INTERVAL_MS);
  }
} else {
  await runStockCheck().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
}
