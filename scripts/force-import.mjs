#!/usr/bin/env node
/**
 * TurboTeknik — Force Import ALL products from turbocentras.com API
 *
 * Fetches every active product ID from the PrestaShop API and upserts
 * them all into Supabase. Never skips a product — retries failures
 * individually until 0 remain.
 *
 * Usage:
 *   node scripts/force-import.mjs
 *   node scripts/force-import.mjs --reset   # clear progress and restart
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, 'force-import-progress.json');
const LOG_FILE      = path.join(__dirname, 'force-import.log');

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE   = 'https://turbocentras.com/api';
const API_KEY    = 'UE79U7CTUM89HTBDC1NIYLDFSMB97N3I';
const API_UA     = 'PsWs TurboTeknik';
const EUR_TO_SEK = 11.5;
const BATCH_SIZE = 50;   // IDs per API fetch
const DELAY_MS   = 300;  // ms between batches
const LANG_ID    = '1';

// ── Env ───────────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
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
  catch { return { doneIds: [], failedIds: [], imported: 0 }; }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function apiFetch(endpoint, retries = 5) {
  const url = `${API_BASE}/${endpoint}`;
  const auth = Buffer.from(`${API_KEY}:`).toString('base64');
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}`, 'User-Agent': API_UA },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = attempt * 2000;
      log(`  Attempt ${attempt} failed (${err.message}), retrying in ${wait}ms…`);
      await sleep(wait);
    }
  }
}

// ── Parse products from XML ───────────────────────────────────────────────────
function imageUrl(imageId) {
  const digits = String(imageId).split('').join('/');
  return `https://turbocentras.com/img/p/${digits}/${imageId}-large_default.jpg`;
}

function parseProducts(xml, categories, manufacturers) {
  const $ = load(xml, { xmlMode: true });
  const results = [];

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

    const manufacturerName = $p.children('manufacturer_name').text().trim();
    const manufacturerId   = $p.children('id_manufacturer').text().trim();
    const brand = manufacturerName || manufacturers[manufacturerId] || 'Okänt';

    // description = description_short HTML (contains alt numbers + turbo compat)
    const descShort = $p.find(`description_short language[id="${LANG_ID}"]`).text().trim();
    const descFull  = $p.find(`description language[id="${LANG_ID}"]`).text().trim();
    const description = descShort || descFull || null;

    const qty     = parseInt($p.children('quantity').text().trim() || '0', 10);
    const inStock = qty > 0;

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
      in_stock: inStock,
    });
  });

  return results;
}

// ── Load lookup tables ────────────────────────────────────────────────────────
async function loadCategories() {
  log('Loading categories…');
  const xml = await apiFetch('categories?display=full');
  const $ = load(xml, { xmlMode: true });
  const map = {};
  $('category').each((_, el) => {
    const id   = $(el).find('id').first().text().trim();
    const name = $(el).find(`name language[id="${LANG_ID}"]`).text().trim()
      || $(el).find('name language').first().text().trim();
    if (id && name) map[id] = name;
  });
  log(`  ${Object.keys(map).length} categories`);
  return map;
}

async function loadManufacturers() {
  log('Loading manufacturers…');
  const xml = await apiFetch('manufacturers?display=full');
  const $ = load(xml, { xmlMode: true });
  const map = {};
  $('manufacturer').each((_, el) => {
    const id   = $(el).find('id').first().text().trim();
    const name = $(el).find('name').first().text().trim();
    if (id && name) map[id] = name;
  });
  log(`  ${Object.keys(map).length} manufacturers`);
  return map;
}

// ── Fetch + upsert a batch of IDs ─────────────────────────────────────────────
async function fetchAndUpsertBatch(ids, categories, manufacturers) {
  const idList = ids.join('%7C');
  const xml = await apiFetch(`products?display=full&filter%5Bid%5D=%5B${idList}%5D`);
  const products = parseProducts(xml, categories, manufacturers);
  if (products.length === 0) return { ok: ids, fail: [] };

  const { error } = await supabase.from('products').upsert(products, { onConflict: 'id' });
  if (error) throw new Error(`Supabase: ${error.message}`);
  return { ok: products.map(p => p.id), fail: ids.filter(id => !products.find(p => p.id === id)) };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('=== Force Import started ===');

  const [categories, manufacturers] = await Promise.all([
    loadCategories(),
    loadManufacturers(),
  ]);

  // Fetch all active product IDs from API
  log('Fetching all active product IDs from API…');
  const idXml = await apiFetch('products?filter%5Bactive%5D=1');
  const allIds = [...new Set([...idXml.matchAll(/\/products\/(\d+)"/g)].map(m => m[1]))];
  const total = allIds.length;
  log(`Found ${total} active products in API`);

  let progress = loadProgress();
  if (process.argv.includes('--reset')) {
    progress = { doneIds: [], failedIds: [], imported: 0 };
    log('Progress reset.');
  }

  const doneSet = new Set(progress.doneIds || []);
  let toProcess = allIds.filter(id => !doneSet.has(id));
  log(`To process: ${toProcess.length} (${doneSet.size} already done)`);

  let imported = progress.imported || 0;

  // ── Pass 1: batch import ──────────────────────────────────────────────────
  const failedIds = new Set(progress.failedIds || []);

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const pct = Math.round((i + batch.length) / total * 100);

    try {
      const { ok, fail } = await fetchAndUpsertBatch(batch, categories, manufacturers);
      imported += ok.length;
      ok.forEach(id => doneSet.add(id));
      fail.forEach(id => failedIds.add(id));
      if (fail.length > 0) log(`  Batch ${i}–${i + batch.length}: ${ok.length} ok, ${fail.length} missing in API response`);
      else log(`Batch ${i}–${i + batch.length}: ${ok.length} upserted — total ${imported}/${total} (${pct}%)`);
    } catch (err) {
      log(`Batch ${i}–${i + batch.length} FAILED: ${err.message} — queuing for individual retry`);
      batch.forEach(id => failedIds.add(id));
    }

    saveProgress({ doneIds: [...doneSet], failedIds: [...failedIds], imported });
    await sleep(DELAY_MS);
  }

  // ── Pass 2: retry failures one by one ─────────────────────────────────────
  let retryRound = 0;
  while (failedIds.size > 0 && retryRound < 10) {
    retryRound++;
    const retryList = [...failedIds];
    log(`\n=== Retry round ${retryRound}: ${retryList.length} failed IDs ===`);

    for (const id of retryList) {
      await sleep(500);
      try {
        const { ok } = await fetchAndUpsertBatch([id], categories, manufacturers);
        if (ok.length > 0) {
          failedIds.delete(id);
          doneSet.add(id);
          imported++;
          log(`  Retry OK: ${id} (total ${imported})`);
        } else {
          log(`  Retry: ${id} — not found in API response (inactive?)`);
          failedIds.delete(id); // not in API anymore, stop retrying
          doneSet.add(id);
        }
      } catch (err) {
        log(`  Retry FAIL: ${id} — ${err.message}`);
        // leave in failedIds for next round
      }
    }

    saveProgress({ doneIds: [...doneSet], failedIds: [...failedIds], imported });

    if (failedIds.size > 0) {
      log(`  ${failedIds.size} still failing, waiting 10s before next round…`);
      await sleep(10000);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const dbCount = await supabase.from('products').select('*', { count: 'exact', head: true });
  log(`\n✅ Force import complete!`);
  log(`   API active products : ${total}`);
  log(`   Upserted this run   : ${imported}`);
  log(`   Still failing       : ${failedIds.size}`);
  log(`   DB total products   : ${dbCount.count ?? '?'}`);

  if (failedIds.size > 0) {
    log(`   Failed IDs: ${[...failedIds].join(', ')}`);
  }

  // Reset progress for next run
  saveProgress({ doneIds: [], failedIds: [], imported: 0 });
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
