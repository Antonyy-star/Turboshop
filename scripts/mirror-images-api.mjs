#!/usr/bin/env node
/**
 * TurboTeknik Image Mirror — API edition
 *
 * Downloads product images from turbocentras.com using the PrestaShop API key
 * (no Playwright, no VPN), uploads them to Supabase Storage, and updates
 * each product's images array with the new public Supabase URLs.
 *
 * Usage:
 *   node scripts/mirror-images-api.mjs            # mirror all products
 *   node scripts/mirror-images-api.mjs --reset    # clear progress and restart
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, 'mirror-api-progress.json');
const LOG_FILE      = path.join(__dirname, 'mirror-api.log');

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE  = 'https://turbocentras.com/api';
const API_KEY   = 'UE79U7CTUM89HTBDC1NIYLDFSMB97N3I';
const API_UA    = 'PsWs TurboTeknik';
const BUCKET    = 'product-images';
const CONCURRENCY = 4;   // products processed in parallel
const DELAY_MS    = 50;  // pause between image downloads (ms)
const PAGE_SIZE   = 500; // products per Supabase page

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
  console.error('Missing Supabase credentials in .env.local');
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
  catch { return { done: [], failed: [] }; }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// Extract image ID from any turbocentras URL format:
//   .../img/p/2/8/6/8/2868-large_default.jpg
//   .../4560-large_default/nozzle-ring-assembly-bw-06-0023.jpg
//   .../4558-thickbox_default/nozzle-ring-assembly-bw-06-0023.jpg
function extractImageId(url) {
  const m = url.match(/\/(\d+)-(?:large|thickbox)_default[/.]/) ?? url.match(/\/(\d+)-large_default\.jpg/);
  return m ? m[1] : null;
}

// Build the authenticated API URL for an image
function apiImageUrl(productId, imageId) {
  return `${API_BASE}/images/products/${productId}/${imageId}`;
}

async function downloadImage(productId, imageId) {
  const url = apiImageUrl(productId, imageId);
  const auth = Buffer.from(`${API_KEY}:`).toString('base64');
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, 'User-Agent': API_UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for image ${productId}/${imageId}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct  = res.headers.get('content-type') || 'image/jpeg';
  return { buf, contentType: ct };
}

async function uploadToStorage(buf, contentType, storagePath) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const progress = loadProgress();
  if (process.argv.includes('--reset')) {
    progress.done = [];
    progress.failed = [];
    log('Progress reset.');
  }
  const doneSet = new Set(progress.done);

  log('Fetching products from Supabase...');
  const allProducts = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, images')
      .range(from, from + PAGE_SIZE - 1);
    if (error) { log(`Supabase error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    allProducts.push(...data);
    from += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  // Only products with turbocentras.com image URLs that haven't been mirrored yet
  const toMirror = allProducts.filter(p =>
    !doneSet.has(String(p.id)) &&
    Array.isArray(p.images) &&
    p.images.some(u => u?.includes('turbocentras.com'))
  );

  log(`Total products: ${allProducts.length} | To mirror: ${toMirror.length} | Already done: ${doneSet.size}`);

  let mirrored = 0, failed = 0, completed = 0;

  async function processProduct(product) {
    const productId = String(product.id);
    const newImages = [];
    let anyFailed = false;

    for (const imgUrl of product.images) {
      if (imgUrl?.includes('supabase.co')) { newImages.push(imgUrl); continue; }
      const imageId = extractImageId(imgUrl);
      if (!imageId) { newImages.push(imgUrl); continue; }
      const storagePath = `products/${productId}/${imageId}.jpg`;
      try {
        const { buf, contentType } = await downloadImage(productId, imageId);
        const publicUrl = await uploadToStorage(buf, contentType, storagePath);
        newImages.push(publicUrl);
        await sleep(DELAY_MS);
      } catch (err) {
        log(`  ✗ ${productId}/${imageId}: ${err.message}`);
        newImages.push(imgUrl);
        anyFailed = true;
      }
    }

    if (newImages.some(u => u?.includes('supabase.co'))) {
      const { error } = await supabase.from('products').update({ images: newImages }).eq('id', productId);
      if (error) log(`  Supabase update error for ${productId}: ${error.message}`);
    }

    doneSet.add(productId);
    if (anyFailed) { progress.failed.push(productId); failed++; } else { mirrored++; }
    completed++;

    if (completed % 100 === 0 || completed === toMirror.length) {
      const pct = Math.round(completed / toMirror.length * 100);
      log(`Progress: ${completed}/${toMirror.length} (${pct}%) — mirrored: ${mirrored}, failed: ${failed}`);
      progress.done = [...doneSet];
      saveProgress(progress);
    }
  }

  // Process CONCURRENCY products at a time
  for (let i = 0; i < toMirror.length; i += CONCURRENCY) {
    const batch = toMirror.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(p => processProduct(p)));
  }

  saveProgress(progress);
  log(`\n✅ Done. Mirrored: ${mirrored}, Failed: ${failed}`);
}

main().catch(err => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});
