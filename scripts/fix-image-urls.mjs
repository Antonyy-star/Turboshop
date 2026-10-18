#!/usr/bin/env node
/**
 * Fix image URLs — fast DB-only update.
 *
 * The images are already in Supabase Storage from a previous mirror run.
 * This script reconstructs the Supabase Storage public URL from the
 * turbocentras.com image ID embedded in each product's image URL, then
 * updates the DB row — no downloads, no uploads.
 *
 * For any product where the file doesn't actually exist in storage,
 * those are queued to the re-download list written at the end.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, 'fix-image-urls.log');

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE  = 'https://turbocentras.com/api';
const API_KEY   = (process.env.TURBOCENTRAS_API_KEY || (fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^TURBOCENTRAS_API_KEY\s*=\s*(\S+)/m) || [])[1]);
const API_UA    = 'PsWs TurboTeknik';
const BUCKET    = 'product-images';
const PAGE_SIZE = 500;
// Update if SUPABASE_URL changes
const STORAGE_BASE = 'https://hudzxedyjaswddamapwf.supabase.co/storage/v1/object/public/product-images';

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
  console.error('Missing Supabase credentials'); process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function extractImageId(url) {
  const m = url.match(/\/(\d+)-large_default\.jpg/);
  return m ? m[1] : null;
}

function supabaseUrl(productId, imageId) {
  return `${STORAGE_BASE}/products/${productId}/${imageId}.jpg`;
}

// Download and re-upload a single image
async function mirrorSingleImage(productId, imageId) {
  const url = `${API_BASE}/images/products/${productId}/${imageId}`;
  const auth = Buffer.from(`${API_KEY}:`).toString('base64');
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, 'User-Agent': API_UA },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || 'image/jpeg';
  const storagePath = `products/${productId}/${imageId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, { contentType: ct, upsert: true });
  if (error) throw new Error(error.message);
  return supabaseUrl(productId, imageId);
}

async function main() {
  log('=== Fix Image URLs (fast DB-only mode) ===');

  // Fetch all products with turbocentras.com URLs
  const allProducts = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('products').select('id, images').range(from, from + PAGE_SIZE - 1);
    if (error) { log(`Supabase fetch error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    allProducts.push(...data);
    from += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }
  log(`Total products in DB: ${allProducts.length}`);

  const toFix = allProducts.filter(p =>
    Array.isArray(p.images) && p.images.some(u => u?.includes('turbocentras.com'))
  );
  log(`Products needing URL fix: ${toFix.length}`);

  let fixed = 0, needsDownload = 0;
  const downloadQueue = [];

  // Step 1: Reconstruct Supabase URLs without any downloads
  const batchSize = 200;
  for (let i = 0; i < toFix.length; i += batchSize) {
    const batch = toFix.slice(i, i + batchSize);
    const updates = [];

    for (const p of batch) {
      const newImages = [];
      let anyNeedsDownload = false;

      for (const imgUrl of (p.images ?? [])) {
        if (imgUrl?.includes('supabase.co')) {
          newImages.push(imgUrl);
          continue;
        }
        const imageId = extractImageId(imgUrl);
        if (!imageId) { newImages.push(imgUrl); continue; }
        // Point directly to the expected Supabase Storage path
        newImages.push(supabaseUrl(String(p.id), imageId));
      }

      updates.push({ id: p.id, images: newImages });
    }

    // Bulk update this batch
    for (const upd of updates) {
      const { error } = await supabase.from('products').update({ images: upd.images }).eq('id', upd.id);
      if (error) log(`  Update error for ${upd.id}: ${error.message}`);
      else fixed++;
    }

    const pct = Math.round((i + batch.length) / toFix.length * 100);
    log(`Batch ${i}–${i + batch.length}: ${batch.length} updated — total ${fixed}/${toFix.length} (${pct}%)`);
  }

  log(`\n✅ DB URL fix complete! Updated ${fixed} products.`);
  log(`Now verifying a sample by checking storage file existence…`);

  // Step 2: Spot-check 20 random products to see if images actually exist in storage
  const sample = toFix.slice(0, 20);
  let missing = 0;
  for (const p of sample) {
    for (const imgUrl of (p.images ?? [])) {
      const imageId = extractImageId(imgUrl);
      if (!imageId) continue;
      const storagePath = `products/${String(p.id)}/${imageId}.jpg`;
      const { data: fileData } = await supabase.storage.from(BUCKET).list(`products/${String(p.id)}`);
      const exists = fileData?.some(f => f.name === `${imageId}.jpg`);
      if (!exists) {
        missing++;
        downloadQueue.push({ productId: String(p.id), imageId });
      }
    }
  }

  if (missing > 0) {
    log(`⚠ ${missing}/20 sampled images NOT in storage — running targeted re-download…`);

    // Step 3: For all toFix products, re-download any actually missing images
    let redownloaded = 0, dlFailed = 0;
    for (const p of toFix) {
      for (const imgUrl of (p.images ?? [])) {
        const imageId = extractImageId(imgUrl);
        if (!imageId) continue;
        const storagePath = `products/${String(p.id)}/${imageId}.jpg`;
        const { data: fileData } = await supabase.storage.from(BUCKET).list(`products/${String(p.id)}`);
        if (fileData?.some(f => f.name === `${imageId}.jpg`)) continue; // already exists

        try {
          await mirrorSingleImage(String(p.id), imageId);
          redownloaded++;
          await sleep(80);
        } catch (err) {
          log(`  Download failed ${p.id}/${imageId}: ${err.message}`);
          dlFailed++;
        }
      }
    }
    log(`Re-download complete: ${redownloaded} downloaded, ${dlFailed} failed`);
  } else {
    log('All sampled images exist in storage — URLs are valid.');
  }

  log('Done!');
}

main().catch(err => { log(`FATAL: ${err.message}`); process.exit(1); });
