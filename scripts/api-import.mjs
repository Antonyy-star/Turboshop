#!/usr/bin/env node
/**
 * TurboTeknik — PrestaShop API Import
 *
 * Fetches all products from turbocentras.com via their PrestaShop webservice
 * and upserts them into Supabase.
 *
 * Usage:
 *   node scripts/api-import.mjs             # full import / update all products
 *   node scripts/api-import.mjs --stock     # stock-only sync (fast, ~1 min)
 *   node scripts/api-import.mjs --reset     # clear progress and restart from scratch
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, 'api-import-progress.json');
const LOG_FILE = path.join(__dirname, 'api-import.log');

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE    = 'https://turbocentras.com/api';
const API_KEY     = (process.env.TURBOCENTRAS_API_KEY || (fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^TURBOCENTRAS_API_KEY\s*=\s*(\S+)/m) || [])[1]);
const API_UA      = 'PsWs TurboTeknik';
const EUR_TO_SEK  = 11.5;   // update if needed
const PAGE_SIZE   = 50;     // products per API page
const DELAY_MS    = 400;    // pause between pages (ms) — be polite
const LANG_ID     = '1';    // language 1 = English

// ── Env ───────────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
  catch { return { offset: 0, imported: 0, errors: 0 }; }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function apiFetch(path) {
  const url = `${API_BASE}/${path}`;
  const auth = Buffer.from(`${API_KEY}:`).toString('base64');
  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': API_UA,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
  return res.text();
}

// Convert PrestaShop image ID → public URL (no auth needed)
// e.g. 2868 → https://turbocentras.com/img/p/2/8/6/8/2868-large_default.jpg
function imageUrl(imageId) {
  const digits = String(imageId).split('').join('/');
  return `https://turbocentras.com/img/p/${digits}/${imageId}-large_default.jpg`;
}

// ── Load lookup tables ────────────────────────────────────────────────────────
async function loadCategories() {
  log('Loading categories...');
  const xml = await apiFetch('categories?display=full');
  const $ = load(xml, { xmlMode: true });
  const map = {};
  $('category').each((_, el) => {
    const id = $(el).find('id').first().text().trim();
    const name = $(el).find(`name language[id="${LANG_ID}"]`).text().trim()
      || $(el).find('name language').first().text().trim();
    if (id && name) map[id] = name;
  });
  log(`  ${Object.keys(map).length} categories loaded`);
  return map;
}

async function loadManufacturers() {
  log('Loading manufacturers...');
  const xml = await apiFetch('manufacturers?display=full');
  const $ = load(xml, { xmlMode: true });
  const map = {};
  $('manufacturer').each((_, el) => {
    const id = $(el).find('id').first().text().trim();
    const name = $(el).find('name').first().text().trim();
    if (id && name) map[id] = name;
  });
  log(`  ${Object.keys(map).length} manufacturers loaded`);
  return map;
}

// ── Parse a batch of products from full XML ───────────────────────────────────
function parseProducts(xml, categories, manufacturers) {
  const $ = load(xml, { xmlMode: true });
  const results = [];

  // Use 'products > product' to avoid matching nested <product> refs inside <accessories> etc.
  $('products > product').each((_, el) => {
    const $p = $(el);

    const id = $p.children('id').text().trim();
    if (!id) return;

    const name = $p.find(`name language[id="${LANG_ID}"]`).text().trim()
      || $p.find('name language').first().text().trim();
    const sku  = $p.children('reference').text().trim() || null;

    const priceEur = parseFloat($p.children('price').text().trim() || '0');
    const priceSek = Math.round(priceEur * EUR_TO_SEK);

    const categoryId = $p.children('id_category_default').text().trim();
    const category   = categories[categoryId] || null;

    const manufacturerId   = $p.children('id_manufacturer').text().trim();
    const manufacturerName = $p.children('manufacturer_name').text().trim();
    const brand = manufacturerName || manufacturers[manufacturerId] || 'Okänt';

    const descShort = $p.find(`description_short language[id="${LANG_ID}"]`).text().trim();
    const descFull  = $p.find(`description language[id="${LANG_ID}"]`).text().trim();
    const description = descShort || descFull || null;

    // NOTE: product.quantity is always 0 in PrestaShop 1.7+; real stock is in stock_availables.
    // in_stock is left out here (see below) and set by `--stock` / the stock-check cron instead.
    const qty = parseInt($p.children('quantity').text().trim() || '0', 10);
    const inStock = qty > 0;

    // Images from associations
    const images = [];
    $p.find('associations images image').each((_, img) => {
      const imgId = $(img).children('id').text().trim();
      if (imgId) images.push(imageUrl(imgId));
    });

    results.push({
      id,
      name: name || sku || `Product ${id}`,
      brand,
      category,
      price: priceSek,
      original_price: null,
      sku,
      images,
      badge: null,
      description,
      ...(qty > 0 ? { in_stock: inStock } : {}),
    });
  });

  return results;
}

// ── Full import ───────────────────────────────────────────────────────────────
async function runFullImport() {
  const [categories, manufacturers] = await Promise.all([
    loadCategories(),
    loadManufacturers(),
  ]);

  // Step 1: fetch all active product IDs (lightweight — no display=full)
  log('Fetching all active product IDs...');
  const idXml = await apiFetch('products?display=%5Bid,active%5D');
  const allIds = [...new Set(
    [...idXml.matchAll(/<id><!\[CDATA\[(\d+)\]\]><\/id>\s*<active><!\[CDATA\[1\]\]><\/active>/g)].map(m => m[1])
  )];
  const total = allIds.length;
  log(`Found ${total} active products`);

  // Resume support: skip IDs already processed
  let progress = loadProgress();
  if (process.argv.includes('--reset')) {
    progress = { doneIds: [], imported: 0, errors: 0 };
    log('Progress reset.');
  }
  const doneSet = new Set(progress.doneIds || []);
  const toProcess = allIds.filter(id => !doneSet.has(id));
  log(`To process: ${toProcess.length} (${doneSet.size} already done)`);

  // Step 2: batch-fetch by ID using filter[id]=[id1|id2|...] — guaranteed to return exactly those products
  let imported = progress.imported || 0;
  let errors   = progress.errors   || 0;

  for (let i = 0; i < toProcess.length; i += PAGE_SIZE) {
    const batch = toProcess.slice(i, i + PAGE_SIZE);
    const idList = batch.join('%7C'); // pipe-separated, URL-encoded
    const endpoint = `products?display=full&filter%5Bid%5D=%5B${idList}%5D`;

    let xml;
    try {
      xml = await apiFetch(endpoint);
    } catch (err) {
      log(`Fetch error for batch ${i}–${i + batch.length}: ${err.message}. Retrying in 5s...`);
      await sleep(5000);
      try { xml = await apiFetch(endpoint); }
      catch (e2) {
        log(`Retry failed: ${e2.message}. Skipping batch.`);
        errors += batch.length;
        batch.forEach(id => doneSet.add(id));
        saveProgress({ doneIds: [...doneSet], imported, errors });
        continue;
      }
    }

    const products = parseProducts(xml, categories, manufacturers);

    if (products.length > 0) {
      const { error } = await supabase
        .from('products')
        .upsert(products, { onConflict: 'id' });

      if (error) {
        log(`Supabase error for batch at ${i}: ${error.message}`);
        errors += batch.length;
      } else {
        imported += products.length;
      }
    }

    batch.forEach(id => doneSet.add(id));
    const pct = Math.round((i + batch.length) / total * 100);
    log(`Batch ${i}–${i + batch.length}: upserted ${products.length} — total ${imported}/${total} (${pct}%)`);

    saveProgress({ doneIds: [...doneSet], imported, errors });
    await sleep(DELAY_MS);
  }

  log(`\n✅ Full import done. Imported: ${imported}, Errors: ${errors}`);
  // Reset progress so next run starts fresh
  saveProgress({ doneIds: [], imported: 0, errors: 0 });
}

// ── Stock-only sync ───────────────────────────────────────────────────────────
async function runStockSync() {
  log('=== Stock sync mode ===');
  log('Fetching all stock records...');

  const xml = await apiFetch('stock_availables?display=full');
  const $ = load(xml, { xmlMode: true });

  const updates = [];
  $('stock_available').each((_, el) => {
    const productId = $(el).find('id_product').text().trim();
    const qty = parseInt($(el).find('quantity').text().trim() || '0', 10);
    // Only simple products (id_product_attribute = 0)
    const attr = $(el).find('id_product_attribute').text().trim();
    if (productId && attr === '0') {
      updates.push({ id: productId, in_stock: qty > 0 });
    }
  });

  log(`Syncing stock for ${updates.length} products...`);

  let changed = 0;
  // Upsert in batches of 500
  for (let i = 0; i < updates.length; i += 500) {
    const batch = updates.slice(i, i + 500);
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      log(`Stock upsert error: ${error.message}`);
    } else {
      changed += batch.length;
    }
    log(`  Stock: ${Math.min(i + 500, updates.length)}/${updates.length}`);
  }

  log(`✅ Stock sync done. ${changed} records updated.`);
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  if (process.argv.includes('--stock')) {
    await runStockSync();
  } else {
    log('=== Full import mode ===');
    await runFullImport();
  }
}

main().catch(err => {
  log(`Fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
