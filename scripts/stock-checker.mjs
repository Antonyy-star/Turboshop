#!/usr/bin/env node
/**
 * TurboTeknik Stock Checker — Playwright edition
 *
 * Visits every product page on turbocentras.com one by one, reads the real
 * stock status, and live-updates Supabase if anything changed.
 *
 * REQUIRES: Lithuanian VPN active (Windscribe → Lithuania)
 *
 * USAGE:
 *   node scripts/stock-checker.mjs
 *
 * Progress is saved to scripts/stock-progress.json — safe to Ctrl+C and restart.
 * When it reaches the last product it wraps back to the first and keeps going.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { chromium } from "../node_modules/playwright/index.mjs";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, "stock-progress.json");
const LOG_FILE = path.join(__dirname, "stock-checker.log");
const SCRAPED_FILE = path.join(__dirname, "scraped-products.json");

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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const DELAY_MS = 800;
const SESSION_REFRESH_EVERY = 80;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
  // Keep log under 1MB
  try {
    if (fs.statSync(LOG_FILE).size > 1_000_000) {
      const lines = fs.readFileSync(LOG_FILE, "utf8").split("\n");
      fs.writeFileSync(LOG_FILE, lines.slice(-1000).join("\n"));
    }
  } catch {}
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")); }
  catch { return { cursor: 0, totalChecked: 0, totalChanged: 0 }; }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function checkStock(page, url) {
  try {
    await page.goto(url, { timeout: 20000, waitUntil: "domcontentloaded" });

    // "Add to cart" button present and enabled = in stock
    const addToCart = await page.$('button[data-button-action="add-to-cart"]:not([disabled])');
    if (addToCart) return true;

    // Explicit out-of-stock text or flag
    const bodyText = (await page.textContent("body") ?? "").toLowerCase();
    if (
      bodyText.includes("out of stock") ||
      bodyText.includes("out-of-stock") ||
      bodyText.includes("unavailable")
    ) return false;

    // Fallback: if no add-to-cart button exists, treat as out of stock
    const anyAddToCart = await page.$('button[data-button-action="add-to-cart"]');
    return !!anyAddToCart;
  } catch {
    return null; // null = couldn't check, skip
  }
}

async function main() {
  log("=== Stock checker starting ===");

  if (!fs.existsSync(SCRAPED_FILE)) {
    log("ERROR: scraped-products.json not found. Run scrape-turbocentras.mjs first.");
    process.exit(1);
  }

  const scraped = JSON.parse(fs.readFileSync(SCRAPED_FILE, "utf8"));
  const products = scraped.filter(p => p.id && p.url);
  log(`Loaded ${products.length} products with URLs`);

  // Load current in_stock values from Supabase
  log("Loading current stock status from Supabase...");
  const dbStockMap = {};
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, in_stock")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error || !data || data.length === 0) break;
    data.forEach(r => { dbStockMap[String(r.id)] = r.in_stock ?? true; });
    if (data.length < 1000) break;
    page++;
  }
  log(`Loaded stock status for ${Object.keys(dbStockMap).length} DB products`);

  // Launch Playwright
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "lt-LT",
  });

  // Warm up session
  log("Establishing browser session...");
  const warmupPage = await context.newPage();
  await warmupPage.goto("https://www.turbocentras.com/", { timeout: 25000, waitUntil: "domcontentloaded" });
  await warmupPage.close();
  log("Session ready.");

  const progress = loadProgress();
  let { cursor, totalChecked, totalChanged } = progress;
  if (cursor >= products.length) cursor = 0; // wrap around

  log(`Resuming from cursor ${cursor}/${products.length} (${totalChecked} checked, ${totalChanged} changes so far)`);

  let requestsSinceRefresh = 0;
  const browserPage = await context.newPage();

  while (true) {
    const product = products[cursor];
    const dbId = String(product.id);
    const currentDbStock = dbStockMap[dbId];

    // Refresh session every N requests
    if (requestsSinceRefresh >= SESSION_REFRESH_EVERY) {
      log("Refreshing session...");
      try {
        const refreshPage = await context.newPage();
        await refreshPage.goto("https://www.turbocentras.com/", { timeout: 20000, waitUntil: "domcontentloaded" });
        await refreshPage.close();
      } catch {}
      requestsSinceRefresh = 0;
    }

    const inStock = await checkStock(browserPage, product.url);
    requestsSinceRefresh++;

    if (inStock !== null && currentDbStock !== undefined && inStock !== currentDbStock) {
      // Status changed — update products and log to stock_events
      const { error } = await supabase
        .from("products")
        .update({ in_stock: inStock })
        .eq("id", product.id);

      if (!error) {
        dbStockMap[dbId] = inStock;
        totalChanged++;
        log(`  ${inStock ? "✓ IN STOCK" : "✗ OUT OF STOCK"}: [${product.brand}] ${product.name} (SKU: ${product.sku})`);

        const { error: evErr } = await supabase.from("stock_events").insert({
          product_id: String(product.id),
          sku: product.sku ?? "",
          product_name: product.name,
          brand: product.brand ?? "",
          old_status: currentDbStock,
          new_status: inStock,
        });
        if (evErr) log(`  [stock_events insert error] id=${product.id} sku=${product.sku}: ${evErr.message}`);
      }
    }

    totalChecked++;
    cursor++;

    // Log progress every 50 products
    if (totalChecked % 50 === 0) {
      log(`Progress: ${cursor}/${products.length} | Checked: ${totalChecked} | Changes: ${totalChanged}`);
      saveProgress({ cursor, totalChecked, totalChanged });
    }

    // Wrap around when done with all products
    if (cursor >= products.length) {
      log(`\n=== Full pass complete. ${totalChanged} changes made. Restarting from beginning... ===\n`);
      cursor = 0;
      saveProgress({ cursor, totalChecked, totalChanged });

      // Reload fresh stock status from Supabase for next pass
      log("Reloading stock status from Supabase for next pass...");
      let p2 = 0;
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select("id, in_stock")
          .range(p2 * 1000, (p2 + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        data.forEach(r => { dbStockMap[String(r.id)] = r.in_stock ?? true; });
        if (data.length < 1000) break;
        p2++;
      }
    }

    await sleep(DELAY_MS);
  }
}

main().catch(async e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
