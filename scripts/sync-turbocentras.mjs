#!/usr/bin/env node
/**
 * Safe Turbocentras → Supabase product sync (replaces api-import.mjs for regular use).
 *
 * - Imports/updates every ACTIVE product from the Turbocentras PrestaShop API.
 * - Never deletes products.
 * - Never overwrites: badge, original_price, specs (admin-managed / scraped data).
 * - Images: keeps already-mirrored Supabase URLs for the same image IDs; new image IDs get a
 *   Turbocentras URL which mirror-images-api.mjs then copies into Supabase Storage.
 * - Category: product's default category; if that is a root ("Home"/"Root"), falls back to the
 *   deepest real category it belongs to.
 *
 *   node scripts/sync-turbocentras.mjs            # dry run: prints what would change
 *   node scripts/sync-turbocentras.mjs --apply    # writes to Supabase
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

const API_BASE = 'https://turbocentras.com/api';
const API_KEY = (process.env.TURBOCENTRAS_API_KEY || (fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^TURBOCENTRAS_API_KEY\s*=\s*(\S+)/m) || [])[1]);
const API_UA = 'PsWs TurboTeknik';
const EUR_TO_SEK = 11.5; // same rate the original importer used
const PAGE_SIZE = 50;
const DELAY_MS = 600;
const LANG_ID = '1';
const ROOT_CATEGORY_IDS = new Set(['1', '2']); // PrestaShop "Root" and "Home"
const SECTION_CATEGORY_IDS = ['6', '103']; // "Turbocharger tuning", "Injectors"

for (const line of fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^﻿/, '');
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, global: { headers: { 'x-turboshop-client': 'site' } } });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = m => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

async function api(p) {
  const auth = Buffer.from(`${API_KEY}:`).toString('base64');
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/${p}`, { headers: { Authorization: `Basic ${auth}`, 'User-Agent': API_UA } });
      if (res.ok) return res.text();
      if (res.status === 401 || res.status === 403) throw new Error(`Turbocentras refused access (${res.status}); stopping to avoid an IP ban`);
      log(`API ${res.status} (attempt ${attempt})`);
    } catch (e) {
      if (String(e.message).includes('refused access')) throw e;
      log(`API error ${e.message} (attempt ${attempt})`);
    }
    await sleep(5000 * attempt);
  }
  throw new Error(`API failed: ${p.slice(0, 100)}`);
}

function tcImageUrl(imageId) {
  return `https://turbocentras.com/img/p/${String(imageId).split('').join('/')}/${imageId}-large_default.jpg`;
}
function imageIdFromUrl(u) {
  let m = String(u).match(/\/products\/\d+\/(\d+)\.\w+$/);
  if (m) return m[1];
  m = String(u).match(/\/(\d+)-(?:large|thickbox)_default[/.]/);
  return m ? m[1] : null;
}

async function main() {
  log(APPLY ? 'APPLY mode: changes will be written' : 'DRY RUN: nothing will be written');

  // Lookups
  const catXml = await api('categories?display=%5Bid,id_parent,level_depth,name%5D');
  const $c = load(catXml, { xmlMode: true });
  const categories = {};
  $c('category').each((_, el) => {
    const id = $c(el).children('id').text().trim();
    categories[id] = {
      name: $c(el).find(`name language[id="${LANG_ID}"]`).text().trim() || $c(el).find('name language').first().text().trim(),
      depth: parseInt($c(el).children('level_depth').text().trim() || '0', 10),
    };
  });
  const manXml = await api('manufacturers?display=%5Bid,name%5D');
  const $m = load(manXml, { xmlMode: true });
  const manufacturers = {};
  $m('manufacturer').each((_, el) => { manufacturers[$m(el).children('id').text().trim()] = $m(el).children('name').text().trim(); });
  log(`${Object.keys(categories).length} categories, ${Object.keys(manufacturers).length} manufacturers`);

  // Existing rows
  const existing = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('products').select('id,name,brand,category,price,sku,images,description,in_stock').order('id').range(from, from + 999);
    if (error) throw new Error(error.message);
    data.forEach(r => existing.set(String(r.id), r));
    if (data.length < 1000) break;
  }
  log(`Supabase has ${existing.size} products`);

  // Real stock lives in stock_availables. product.quantity is always 0 in PrestaShop 1.7+.
  const stockXml = await api('stock_availables?display=%5Bid_product,id_product_attribute,quantity%5D');
  const stock = new Map();
  for (const [, block] of stockXml.matchAll(/<stock_available>([\s\S]*?)<\/stock_available>/g)) {
    const pid = block.match(/<id_product[^>]*>\s*<!\[CDATA\[(\d+)/)?.[1];
    const attr = block.match(/<id_product_attribute[^>]*>\s*<!\[CDATA\[(\d+)/)?.[1];
    const qty = parseInt(block.match(/<quantity[^>]*>\s*<!\[CDATA\[(-?\d+)/)?.[1] ?? '0', 10);
    if (pid && attr === '0') stock.set(pid, qty > 0);
  }
  log(`Stock records: ${stock.size}`);

  // Active product IDs. Don't use filter[active]=1: Turbocentras' API silently drops ~1,100
  // active products from that filter. Read every product's own active flag instead.
  const idXml = await api('products?display=%5Bid,active%5D');
  const activeIds = [...new Set([...idXml.matchAll(/<id><!\[CDATA\[(\d+)\]\]><\/id>\s*<active><!\[CDATA\[1\]\]><\/active>/g)].map(m => m[1]))];
  // Discontinued (inactive) products that are already in our shop: refresh their data too,
  // but always mark them out of stock. Never deleted.
  const inactiveInShop = new Set([...idXml.matchAll(/<id><!\[CDATA\[(\d+)\]\]><\/id>\s*<active><!\[CDATA\[0\]\]><\/active>/g)]
    .map(m => m[1]).filter(id => existing.has(id)));
  const ids = [...activeIds, ...inactiveInShop];
  log(`Discontinued products already in shop: ${inactiveInShop.size}`);
  log(`Turbocentras has ${activeIds.length} active products`);

  if (ids.length < 1000) throw new Error(`Only ${ids.length} active products found; refusing to continue`);
  const stats = { new: 0, updated: 0, unchanged: 0, fields: {}, newImages: 0, priceChanges: [] };
  const writes = [];

  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const batch = ids.slice(i, i + PAGE_SIZE);
    const xml = await api(`products?display=full&filter%5Bid%5D=%5B${batch.join('%7C')}%5D`);
    const $ = load(xml, { xmlMode: true });

    $('products > product').each((_, el) => {
      const $p = $(el);
      const id = $p.children('id').text().trim();
      if (!id) return;
      const sku = $p.children('reference').text().trim() || null;
      const name = $p.find(`name language[id="${LANG_ID}"]`).first().text().trim() || $p.find('name language').first().text().trim() || sku || `Product ${id}`;
      const brand = $p.children('manufacturer_name').text().trim() || manufacturers[$p.children('id_manufacturer').text().trim()] || 'Okänt';

      let catId = $p.children('id_category_default').text().trim();
      const assoc = [];
      $p.find('associations categories category').each((_, c) => assoc.push($(c).children('id').text().trim()));
      // Shop sections (Tuning, Injectors) win over the part type, so those pages keep their products
      const section = SECTION_CATEGORY_IDS.find(s => assoc.includes(s) || catId === s);
      if (section) catId = section;
      else if (!categories[catId] || ROOT_CATEGORY_IDS.has(catId)) {
        const best = assoc.filter(c => categories[c] && !ROOT_CATEGORY_IDS.has(c)).sort((a, b) => categories[b].depth - categories[a].depth)[0];
        if (best) catId = best;
      }
      const category = categories[catId] && !ROOT_CATEGORY_IDS.has(catId) ? categories[catId].name : null;

      const priceEur = parseFloat($p.children('price').text().trim() || '0');
      // Tiny parts (e.g. €0.04 clips) would round to 0 kr; charge at least 1 kr
      const price = priceEur > 0 ? Math.max(1, Math.round(priceEur * EUR_TO_SEK)) : 0;
      const descShort = $p.find(`description_short language[id="${LANG_ID}"]`).first().text().trim();
      const descFull = $p.find(`description language[id="${LANG_ID}"]`).first().text().trim();
      const description = descShort || descFull || null;
      const orderable = $p.children('available_for_order').text().trim() !== '0' && $p.children('show_price').text().trim() !== '0';
      const inStock = inactiveInShop.has(id) || !orderable ? false : stock.has(id) ? stock.get(id) : (existing.get(id)?.in_stock ?? false);

      const tcImageIds = [];
      $p.find('associations images image').each((_, img) => { const x = $(img).children('id').text().trim(); if (x) tcImageIds.push(x); });

      const old = existing.get(id);
      // Keep the mirrored URL when we already have that image; otherwise use Turbocentras URL
      const oldById = new Map((old?.images ?? []).map(u => [imageIdFromUrl(u), u]));
      const images = tcImageIds.map(x => oldById.get(x) ?? tcImageUrl(x));
      const unchangedImages = old && JSON.stringify(old.images ?? []) === JSON.stringify(images);
      // Supplier has no images but we have mirrored copies: keep ours. Dead supplier links are dropped.
      const mirrored = (old?.images ?? []).filter(u => String(u).includes('supabase.co'));
      const finalImages = tcImageIds.length === 0 && mirrored.length > 0 ? mirrored : images;
      stats.newImages += finalImages.filter(u => u.includes('turbocentras.com')).length;

      const row = { id, name, brand, category: category ?? old?.category ?? null, price: price || old?.price || 0, sku, images: finalImages, description: description ?? old?.description ?? null, in_stock: inStock };

      if (!old) { stats.new++; writes.push(row); return; }
      const changed = ['name', 'brand', 'category', 'price', 'sku', 'description', 'in_stock'].filter(k => String(old[k] ?? '') !== String(row[k] ?? ''));
      if (!unchangedImages && JSON.stringify(old.images ?? []) !== JSON.stringify(finalImages)) changed.push('images');
      if (changed.length === 0) { stats.unchanged++; return; }
      changed.forEach(k => { stats.fields[k] = (stats.fields[k] ?? 0) + 1; });
      if (changed.includes('price') && stats.priceChanges.length < 10) stats.priceChanges.push(`${id} ${sku}: ${old.price} → ${row.price}`);
      stats.updated++;
      writes.push(row);
    });

    if ((i / PAGE_SIZE) % 20 === 0) log(`Read ${Math.min(i + PAGE_SIZE, ids.length)}/${ids.length}`);
    await sleep(DELAY_MS);
  }

  log(`New: ${stats.new}, to update: ${stats.updated}, unchanged: ${stats.unchanged}`);
  log(`Changed fields: ${JSON.stringify(stats.fields)}`);
  log(`Images still to mirror after sync: ${stats.newImages}`);
  if (stats.priceChanges.length) log(`Sample price changes: ${stats.priceChanges.join(' | ')}`);

  if (!APPLY) { log('DRY RUN done. Run with --apply to write.'); return; }

  // Upsert only the listed columns, so badge/original_price/specs stay untouched
  for (let i = 0; i < writes.length; i += 200) {
    const { error } = await supabase.from('products').upsert(writes.slice(i, i + 200), { onConflict: 'id' });
    if (error) throw new Error(`Upsert failed at ${i}: ${error.message}`);
  }
  log(`Wrote ${writes.length} products.`);
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
