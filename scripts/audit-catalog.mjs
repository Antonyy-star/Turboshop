#!/usr/bin/env node
/**
 * READ-ONLY catalog audit: compares turbocentras.com (PrestaShop API) with Supabase.
 * Changes nothing. Writes scripts/audit-report.json.
 *
 * Checks:
 *  - products in Turbocentras but missing in Supabase (and vice versa)
 *  - duplicate products in Supabase (same normalized SKU)
 *  - per product: images in Turbocentras vs images linked in Supabase
 *  - duplicate image links inside a product
 *  - storage files: unreferenced files, identical files (same eTag) per product
 *
 * Usage: node scripts/audit-catalog.mjs
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'audit-report.json');

const API_BASE = 'https://turbocentras.com/api';
const API_KEY = (process.env.TURBOCENTRAS_API_KEY || (fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^TURBOCENTRAS_API_KEY\s*=\s*(\S+)/m) || [])[1]);
const API_UA = 'PsWs TurboTeknik';
const PAGE_SIZE = 50;
const DELAY_MS = 600;
const BUCKET = 'product-images';

for (const line of fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^﻿/, '');
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = m => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const normSku = s => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function api(p) {
  const auth = Buffer.from(`${API_KEY}:`).toString('base64');
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${API_BASE}/${p}`, { headers: { Authorization: `Basic ${auth}`, 'User-Agent': API_UA } });
    if (res.ok) return res.text();
    log(`API ${res.status} on ${p.slice(0, 80)} (attempt ${attempt})`);
    if (res.status === 401 || res.status === 403) throw new Error(`Turbocentras API refused access (${res.status}) - stopping to avoid an IP ban`);
    await sleep(5000 * attempt);
  }
  throw new Error(`API failed: ${p}`);
}

// ── 1. Turbocentras ──────────────────────────────────────────────────────────
async function loadTurbocentras() {
  log('Turbocentras: fetching active product IDs...');
  const idXml = await api('products?display=%5Bid,active%5D');
  const ids = [...new Set([...idXml.matchAll(/<id><!\[CDATA\[(\d+)\]\]><\/id>\s*<active><!\[CDATA\[1\]\]><\/active>/g)].map(m => m[1]))];
  log(`Turbocentras: ${ids.length} active products`);
  const tc = new Map();
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const batch = ids.slice(i, i + PAGE_SIZE);
    const xml = await api(`products?display=full&filter%5Bid%5D=%5B${batch.join('%7C')}%5D`);
    const $ = load(xml, { xmlMode: true });
    $('products > product').each((_, el) => {
      const $p = $(el);
      const id = $p.children('id').text().trim();
      const images = [];
      $p.find('associations images image').each((_, img) => {
        const imgId = $(img).children('id').text().trim();
        if (imgId) images.push(imgId);
      });
      tc.set(id, { id, sku: $p.children('reference').text().trim() || null, images });
    });
    if ((i / PAGE_SIZE) % 10 === 0) log(`Turbocentras: ${Math.min(i + PAGE_SIZE, ids.length)}/${ids.length}`);
    await sleep(DELAY_MS);
  }
  return tc;
}

// ── 2. Supabase products ─────────────────────────────────────────────────────
async function loadSupabaseProducts() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('products').select('id,name,sku,brand,images,created_at').range(from, from + 999);
    if (error) throw new Error(`Supabase products: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  log(`Supabase: ${rows.length} products`);
  return rows;
}

// ── 3. Supabase storage ──────────────────────────────────────────────────────
async function listFolder(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`Storage list ${prefix}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function walk(prefix, files) {
  const entries = await listFolder(prefix);
  const folders = [];
  for (const e of entries) {
    const full = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.id === null) folders.push(full);
    else files.push({ path: full, size: e.metadata?.size ?? 0, etag: e.metadata?.eTag ?? null });
  }
  for (let i = 0; i < folders.length; i += 10) {
    await Promise.all(folders.slice(i, i + 10).map(f => walk(f, files)));
  }
}

async function loadStorage() {
  log('Supabase storage: listing all files (can take a few minutes)...');
  const files = [];
  await walk('', files);
  const total = files.reduce((s, f) => s + f.size, 0);
  log(`Supabase storage: ${files.length} files, ${(total / 1e9).toFixed(3)} GB`);
  return files;
}

// ── Analysis ─────────────────────────────────────────────────────────────────
function storagePathFromUrl(u) {
  const m = String(u).match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/);
  return m ? decodeURIComponent(m[1].split('?')[0]) : null;
}

function tcImageIdFromUrl(u) {
  let m = String(u).match(/\/products\/\d+\/(\d+)\.\w+$/);
  if (m) return m[1];
  m = String(u).match(/\/(\d+)-(?:large|thickbox)_default[/.]/);
  if (m) return m[1];
  m = String(u).match(/\/img\/p\/(?:\d\/)+(\d+)-/);
  return m ? m[1] : null;
}

async function main() {
  const [tc, products, files] = await Promise.all([loadTurbocentras(), loadSupabaseProducts(), loadStorage()]);

  const sbById = new Map(products.map(p => [String(p.id), p]));
  const report = { generated: new Date().toISOString(), summary: {} };

  report.missingInSupabase = [...tc.keys()].filter(id => !sbById.has(id));
  report.notInTurbocentras = products.filter(p => !tc.has(String(p.id))).map(p => ({ id: p.id, sku: p.sku, name: p.name, brand: p.brand }));

  // duplicate products by normalized SKU
  const bySku = new Map();
  for (const p of products) {
    const k = normSku(p.sku);
    if (!k) continue;
    if (!bySku.has(k)) bySku.set(k, []);
    bySku.get(k).push(p);
  }
  report.duplicateProducts = [...bySku.values()].filter(g => g.length > 1).map(g => g.map(p => ({
    id: p.id, sku: p.sku, name: p.name, brand: p.brand, images: (p.images ?? []).length, inTurbocentras: tc.has(String(p.id)),
  })));

  // images per product
  const referenced = new Set();
  report.duplicateImageLinks = [];
  report.imageMismatch = [];
  report.externalImageLinks = 0;
  for (const p of products) {
    const imgs = p.images ?? [];
    imgs.forEach(u => { const sp = storagePathFromUrl(u); if (sp) referenced.add(sp); else report.externalImageLinks++; });
    const dupLinks = imgs.filter((u, i) => imgs.indexOf(u) !== i);
    const ids = imgs.map(tcImageIdFromUrl).filter(Boolean);
    const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dupLinks.length || dupIds.length) report.duplicateImageLinks.push({ id: p.id, sku: p.sku, total: imgs.length, duplicateLinks: dupLinks.length, duplicateImageIds: [...new Set(dupIds)] });

    const t = tc.get(String(p.id));
    if (t) {
      const sbSet = new Set(ids);
      const missing = t.images.filter(x => !sbSet.has(x));
      const extra = [...sbSet].filter(x => !t.images.includes(x));
      if (missing.length || extra.length) report.imageMismatch.push({ id: p.id, sku: p.sku, turbocentras: t.images.length, supabase: imgs.length, missing, extra });
    }
  }

  // storage files
  const unreferenced = files.filter(f => !referenced.has(f.path));
  const missingFiles = [...referenced].filter(p => !files.some(f => f.path === p));
  const byFolderEtag = new Map();
  for (const f of files) {
    if (!f.etag) continue;
    const k = `${path.posix.dirname(f.path)}|${f.etag}`;
    if (!byFolderEtag.has(k)) byFolderEtag.set(k, []);
    byFolderEtag.get(k).push(f.path);
  }
  const byEtag = new Map();
  for (const f of files) { if (f.etag) { if (!byEtag.has(f.etag)) byEtag.set(f.etag, []); byEtag.get(f.etag).push(f); } }

  const topFolders = {};
  for (const f of files) { const t = f.path.split('/')[0]; topFolders[t] ??= { files: 0, bytes: 0, unreferenced: 0, unreferencedBytes: 0 }; topFolders[t].files++; topFolders[t].bytes += f.size; }
  for (const f of unreferenced) { const t = f.path.split('/')[0]; topFolders[t].unreferenced++; topFolders[t].unreferencedBytes += f.size; }

  report.storage = {
    files: files.length,
    gb: +(files.reduce((s, f) => s + f.size, 0) / 1e9).toFixed(3),
    topFolders,
    unreferencedFiles: unreferenced.length,
    unreferencedGb: +(unreferenced.reduce((s, f) => s + f.size, 0) / 1e9).toFixed(3),
    linkedButMissingFiles: missingFiles.length,
    identicalFilesSameProduct: [...byFolderEtag.values()].filter(g => g.length > 1).length,
    identicalContentGroupsAnywhere: [...byEtag.values()].filter(g => g.length > 1).length,
  };
  report.unreferencedFileList = unreferenced.map(f => f.path);
  report.linkedButMissingFileList = missingFiles;
  report.identicalFilesSameProductList = [...byFolderEtag.values()].filter(g => g.length > 1);

  report.summary = {
    turbocentrasProducts: tc.size,
    turbocentrasImages: [...tc.values()].reduce((s, t) => s + t.images.length, 0),
    supabaseProducts: products.length,
    missingInSupabase: report.missingInSupabase.length,
    notInTurbocentras: report.notInTurbocentras.length,
    duplicateProductGroups: report.duplicateProducts.length,
    productsWithDuplicateImageLinks: report.duplicateImageLinks.length,
    productsWithImageMismatch: report.imageMismatch.length,
    externalImageLinks: report.externalImageLinks,
    storage: report.storage,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  log(`Report written to ${OUT}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
