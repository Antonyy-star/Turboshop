#!/usr/bin/env node
/**
 * TurboTeknik Image Mirroring Script
 *
 * Downloads all product images from turbocentras.com and re-hosts them
 * in Supabase Storage. Then updates the database with the new URLs.
 *
 * USAGE:
 *   node scripts/mirror-images.mjs
 *
 * REQUIRES: Lithuanian VPN/proxy active (turbocentras.com blocks non-LT IPs)
 *   Set HTTP_PROXY / HTTPS_PROXY env vars if using a proxy server:
 *   HTTPS_PROXY=http://your-proxy:8080 node scripts/mirror-images.mjs
 *
 * Progress is saved to scripts/mirror-progress.json — safe to restart.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, "mirror-progress.json");
const LOG_FILE = path.join(__dirname, "mirror-images.log");

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

const BUCKET = "product-images";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://turbocentras.com/",
};

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  } catch {
    return { done: [], failed: [] };
  }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadImage(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return { buf: Buffer.from(buf), contentType };
}

function getExtFromUrl(url) {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext ?? "") ? ext : "jpg";
}

async function uploadToSupabase(buf, contentType, storagePath) {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  log("=== Image mirror starting ===");

  // Load all products with turbocentras images
  const { data: products, error } = await supabase
    .from("products")
    .select("id, images")
    .not("images", "eq", "[]")
    .not("images", "is", null);

  if (error) { log("DB error: " + error.message); process.exit(1); }

  const toProcess = (products ?? []).filter(
    (p) => Array.isArray(p.images) && p.images.some((u) => u?.includes("turbocentras.com"))
  );

  log(`Products with turbocentras images: ${toProcess.length}`);

  const progress = loadProgress();
  const doneSet = new Set(progress.done.map(String));

  let processed = 0, skipped = 0, failed = 0;

  for (const product of toProcess) {
    if (doneSet.has(String(product.id))) { skipped++; continue; }

    const newImages = [];
    let anyChanged = false;

    for (const imgUrl of product.images) {
      if (!imgUrl?.includes("turbocentras.com")) {
        newImages.push(imgUrl);
        continue;
      }

      try {
        const { buf, contentType } = await downloadImage(imgUrl);
        const ext = getExtFromUrl(imgUrl);
        // Derive storage path from URL (e.g. "9581-thickbox_default/cartridge-ih-00-0008")
        const urlPart = imgUrl.replace("https://turbocentras.com/", "").replace(/\.[^.]+$/, "");
        const storagePath = `tc/${urlPart}.${ext}`;

        const publicUrl = await uploadToSupabase(buf, contentType, storagePath);
        newImages.push(publicUrl);
        anyChanged = true;
        log(`  ✓ ${product.id}: ${imgUrl.split("/").pop()} → Supabase`);
      } catch (e) {
        log(`  ✗ ${product.id}: ${imgUrl} — ${e.message}`);
        newImages.push(imgUrl); // keep original on failure
        failed++;
      }

      await sleep(200); // be polite
    }

    if (anyChanged) {
      const { error: updateErr } = await supabase
        .from("products")
        .update({ images: newImages })
        .eq("id", product.id);

      if (updateErr) {
        log(`  DB update error for ${product.id}: ${updateErr.message}`);
      }
    }

    doneSet.add(String(product.id));
    progress.done.push(product.id);
    processed++;

    // Save progress every 10 products
    if (processed % 10 === 0) {
      saveProgress(progress);
      log(`Progress saved: ${processed}/${toProcess.length - skipped} processed, ${skipped} skipped`);
    }
  }

  saveProgress(progress);
  log(`=== Done. Processed: ${processed}, Skipped (already done): ${skipped}, Individual failures: ${failed} ===`);
  log(`Check ${LOG_FILE} for details.`);
}

main().catch((e) => log(`FATAL: ${e.message}`));
