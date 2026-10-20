// One-off: shrink Supabase Storage by converting every product image to WebP.
//   npx tsx scripts/convert-images-webp.ts            convert all products (resumable)
//   npx tsx scripts/convert-images-webp.ts --check    only report what is left
//   npx tsx scripts/convert-images-webp.ts --limit 5  convert a few products as a test
//   npx tsx scripts/convert-images-webp.ts --cleanup  delete the old JPEGs (run 1h+ later)
//
// For each product: fetch the original from Turbocentras (falls back to our own
// copy), store products/<id>/<imageId>.webp and point the product at the new files.
// The old JPEGs are deleted in a separate --cleanup run at least an hour later, so
// cached pages (catalog: 1h) never show a missing image. Also removes unreferenced
// files in the old tc/ folder.
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^﻿/, "");
}

const BUCKET = "product-images";
const CONCURRENCY = 6;
const PROGRESS_FILE = path.join(__dirname, "convert-images-progress.json");

async function main() {
  const { compressProductImage, PRODUCT_IMAGE_EXT, PRODUCT_IMAGE_TYPE } = await import("../src/lib/images/compress");
  const { authHeader, API_BASE, API_UA } = await import("../src/lib/turbocentras/api");
  const { fetchAll } = await import("../src/lib/supabase/fetchAll");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { headers: { "x-turboshop-client": "site" } },
  });
  const storage = supabase.storage.from(BUCKET);
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const storagePath = (url: string) => (url.includes(marker) ? decodeURIComponent(url.split(marker)[1].split("?")[0]) : null);
  const imageIdOf = (url: string) => url.match(/\/products\/\d+\/(\d+)\.\w+$/)?.[1] ?? url.match(/\/(\d+)-(?:large|thickbox)_default[/.]/)?.[1] ?? null;

  type Row = { id: string; images: string[] | null };
  const rows = await fetchAll<Row>((f, t) => supabase.from("products").select("id, images").order("id").range(f, t));
  const needsWork = (r: Row) => (r.images ?? []).some(u => storagePath(u) && !u.endsWith(`.${PRODUCT_IMAGE_EXT}`));
  const todo = rows.filter(needsWork);
  console.log(`products ${rows.length}, still with old images: ${todo.length}`);
  if (process.argv.includes("--check")) return;

  type Progress = { done: Record<string, true>; pending: string[] };
  const saved = fs.existsSync(PROGRESS_FILE) ? JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")) : {};
  const progress: Progress = saved.done ? saved : { done: saved, pending: [] };
  const { done } = progress;
  const save = () => fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
  const usedPaths = async () => new Set(
    (await fetchAll<Row>((f, t) => supabase.from("products").select("id, images").order("id").range(f, t)))
      .flatMap(r => (r.images ?? []).map(storagePath).filter(Boolean) as string[]),
  );

  if (process.argv.includes("--cleanup")) {
    const used = await usedPaths();
    const remove = [...new Set(progress.pending)].filter(p => !used.has(p));
    for (let i = 0; i < remove.length; i += 500) {
      const { error } = await storage.remove(remove.slice(i, i + 500));
      if (error) throw new Error(`remove failed: ${error.message}`);
    }
    console.log(`cleanup: deleted ${remove.length} old files (${progress.pending.length - remove.length} kept because still in use)`);
    progress.pending = [];
    save();
    return;
  }
  let converted = 0, failed = 0, bytesBefore = 0, bytesAfter = 0, finished = 0;
  const t0 = Date.now();

  async function original(productId: string, url: string, imageId: string | null): Promise<Buffer | null> {
    if (imageId) {
      try {
        const res = await fetch(`${API_BASE}/images/products/${productId}/${imageId}`, { headers: { Authorization: authHeader(), "User-Agent": API_UA } });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
      } catch { /* fall back to our copy */ }
    }
    try {
      const res = await fetch(url);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch { /* give up on this image */ }
    return null;
  }

  async function convertProduct(row: Row) {
    const images = row.images ?? [];
    const next: string[] = [];
    const remove: string[] = [];
    for (const url of images) {
      const oldPath = storagePath(url);
      if (!oldPath || url.endsWith(`.${PRODUCT_IMAGE_EXT}`)) { next.push(url); continue; }
      const imageId = imageIdOf(url);
      const newPath = `products/${row.id}/${imageId ?? path.basename(oldPath).replace(/\.\w+$/, "")}.${PRODUCT_IMAGE_EXT}`;
      const src = await original(row.id, url, imageId);
      if (!src) { next.push(url); failed++; continue; }
      const webp = await compressProductImage(src);
      const { error } = await storage.upload(newPath, webp, { contentType: PRODUCT_IMAGE_TYPE, upsert: true, cacheControl: "31536000" });
      if (error) { next.push(url); failed++; continue; }
      next.push(storage.getPublicUrl(newPath).data.publicUrl);
      if (oldPath !== newPath) remove.push(oldPath);
      bytesBefore += src.length; bytesAfter += webp.length; converted++;
    }
    if (JSON.stringify(next) !== JSON.stringify(images)) {
      const { error } = await supabase.from("products").update({ images: next }).eq("id", row.id);
      if (error) throw new Error(`update ${row.id}: ${error.message}`);
    }
    // Old files are deleted later by --cleanup, after cached pages have refreshed.
    progress.pending.push(...remove);
  }

  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;
  // Picked from the current database state, so a re-run also fixes products the
  // hourly product sync may have pointed back at an old file.
  const queue = todo.slice(0, limit);
  async function worker() {
    for (;;) {
      const row = queue.shift();
      if (!row) return;
      try {
        await convertProduct(row);
        done[row.id] = true;
      } catch (e) {
        failed++;
        console.log(`product ${row.id} failed: ${(e as Error).message}`);
      }
      if (++finished % 100 === 0) {
        save();
        const mins = ((Date.now() - t0) / 60000).toFixed(1);
        console.log(`${finished}/${queue.length + finished} products, ${converted} images, ${(bytesBefore / 1e6).toFixed(0)} MB -> ${(bytesAfter / 1e6).toFixed(0)} MB, ${failed} failed, ${mins} min`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  save();

  if (Number.isFinite(limit)) {
    console.log(`test run: ${converted} images, ${(bytesBefore / 1e3).toFixed(0)} KB -> ${(bytesAfter / 1e3).toFixed(0)} KB, ${failed} failed`);
    return;
  }

  // Old tc/ folder: delete files no product uses (listed by the earlier audit).
  const report = JSON.parse(fs.readFileSync(path.join(__dirname, "audit-report.json"), "utf8"));
  const fresh = await fetchAll<Row>((f, t) => supabase.from("products").select("id, images").order("id").range(f, t));
  const used = await usedPaths();
  const orphans = (report.unreferencedFileList as string[]).filter(p => p.startsWith("tc/") && !used.has(p));
  for (let i = 0; i < orphans.length; i += 500) await storage.remove(orphans.slice(i, i + 500));

  console.log(`done: ${converted} images converted (${(bytesBefore / 1e6).toFixed(0)} MB -> ${(bytesAfter / 1e6).toFixed(0)} MB), ${failed} failed, ${orphans.length} unused tc/ files removed, ${progress.pending.length} old files waiting for --cleanup, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  console.log(`still with old images: ${fresh.filter(needsWork).length}`);
}

main().catch(e => { console.error("FATAL", e.message); process.exit(1); });
