#!/usr/bin/env node
/**
 * TurboTeknik Image Mirror — Playwright edition
 *
 * Downloads product images from turbocentras.com via a real Chromium browser
 * (bypasses their TLS/bot fingerprinting) and uploads them to Supabase Storage.
 * Then updates each product row with the new Supabase URL.
 *
 * REQUIRES: Lithuanian VPN active (Windscribe → Lithuania)
 *
 * USAGE:
 *   node scripts/mirror-images.mjs
 *
 * Progress is saved to scripts/mirror-progress.json — safe to Ctrl+C and restart.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { chromium } from "../node_modules/playwright/index.mjs";
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

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")); }
  catch { return { done: [], failed: [] }; }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
  log("=== Image mirror starting (Playwright edition) ===");

  // Launch Chromium
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "lt-LT",
  });

  // Visit homepage once to get session cookies
  log("Establishing browser session with turbocentras.com...");
  const page = await context.newPage();
  await page.goto("https://www.turbocentras.com/", { timeout: 25000, waitUntil: "domcontentloaded" });
  await page.close();
  log("Session ready.");

  // Load all products with turbocentras images
  const { data: products, error } = await supabase
    .from("products")
    .select("id, images")
    .not("images", "is", null);

  if (error) { log("DB error: " + error.message); await browser.close(); process.exit(1); }

  const toProcess = (products ?? []).filter(
    p => Array.isArray(p.images) && p.images.some(u => u?.includes("turbocentras.com"))
  );

  log(`Products with turbocentras images: ${toProcess.length}`);

  const progress = loadProgress();
  const doneSet = new Set(progress.done.map(String));

  let processed = 0, skipped = 0, failed = 0;
  let requestsSinceRefresh = 0;

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
        // Re-establish session every 100 images to keep cookies fresh
        if (requestsSinceRefresh >= 100) {
          log("Refreshing browser session...");
          const refreshPage = await context.newPage();
          await refreshPage.goto("https://www.turbocentras.com/", { timeout: 20000, waitUntil: "domcontentloaded" });
          await refreshPage.close();
          requestsSinceRefresh = 0;
          log("Session refreshed.");
        }

        const res = await context.request.get(imgUrl, {
          headers: { Referer: "https://www.turbocentras.com/" },
          timeout: 20000,
        });

        requestsSinceRefresh++;

        if (!res.ok()) throw new Error(`HTTP ${res.status()}`);

        const buf = await res.body();
        const contentType = res.headers()["content-type"] ?? "image/jpeg";
        const ext = getExtFromUrl(imgUrl);
        const urlPart = imgUrl.replace("https://turbocentras.com/", "").replace(/\.[^.]+$/, "");
        const storagePath = `tc/${urlPart}.${ext}`;

        const publicUrl = await uploadToSupabase(buf, contentType, storagePath);
        newImages.push(publicUrl);
        anyChanged = true;
        log(`  ✓ ${product.id}: ${imgUrl.split("/").pop()} → Supabase (${buf.length} bytes)`);
      } catch (e) {
        log(`  ✗ ${product.id}: ${imgUrl} — ${e.message}`);
        newImages.push(imgUrl);
        failed++;
      }

      await sleep(300);
    }

    if (anyChanged) {
      const { error: updateErr } = await supabase
        .from("products")
        .update({ images: newImages })
        .eq("id", product.id);
      if (updateErr) log(`  DB update error for ${product.id}: ${updateErr.message}`);
    }

    doneSet.add(String(product.id));
    progress.done.push(product.id);
    processed++;

    if (processed % 10 === 0) {
      saveProgress(progress);
      log(`Progress: ${processed}/${toProcess.length - skipped} processed, ${skipped} skipped, ${failed} failures`);
    }
  }

  saveProgress(progress);
  await browser.close();
  log(`=== Done. Processed: ${processed}, Skipped: ${skipped}, Failures: ${failed} ===`);
}

main().catch(async e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
