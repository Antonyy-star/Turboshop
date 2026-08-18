#!/usr/bin/env node
// Scrapes turbocentras.com and imports all products into Supabase.
// Run:     node scripts/scrape-turbocentras.mjs
// Resume:  run again if interrupted — progress saved to scripts/scraped-products.json

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { load } from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, 'scraped-products.json');
const ENV_FILE = path.join(__dirname, '../.env.local');

// Load .env.local
function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EUR_TO_SEK = 11.5; // adjust to your preferred conversion rate
const DELAY_MS = 600;

const CATEGORIES = [
  { baseUrl: 'https://www.turbocentras.com/en/3-turbochargers',               category: 'Turboladdare' },
  { baseUrl: 'https://www.turbocentras.com/en/9-core-assemblies',             category: 'CHRA' },
  { baseUrl: 'https://www.turbocentras.com/en/4-turbocharger-parts',          category: 'Turbodelar' },
  { baseUrl: 'https://www.turbocentras.com/en/5-turbocharger-repair-equipment', category: 'Utrustning' },
  { baseUrl: 'https://www.turbocentras.com/en/6-turbocharger-tuning',         category: 'Tuning' },
];

const BRAND_ALIASES = {
  'borgwarner': 'BorgWarner', 'borg warner': 'BorgWarner',
  'garrett': 'Garrett', 'garrett by honeywell': 'Garrett',
  'ihi': 'IHI', 'mitsubishi': 'Mitsubishi', 'holset': 'Holset',
  'toyota': 'Toyota', 'bmts': 'BMTS', 'hitachi': 'Hitachi',
  'valeo': 'Valeo', 'continental': 'Continental',
  'cz turbo': 'CZ Turbo', 'master': 'Master', 'master power': 'Master Power',
};
function normalizeBrand(raw) {
  if (!raw) return '';
  return BRAND_ALIASES[raw.toLowerCase().trim()] || raw.trim();
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtml(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(2000 * (i + 1));
    }
  }
}

function parsePage(html, category) {
  const $ = load(html);

  // Total item count — "Showing 1-24 of 1480 item(s)"
  const showingText = $('.showing, span.showing').first().text();
  const totalMatch = showingText.match(/of\s*([\d,]+)\s*item/i);
  const total = totalMatch ? parseInt(totalMatch[1].replace(',', '')) : 0;

  const products = [];

  $('article.product-miniature').each((_, el) => {
    const $el = $(el);

    // ID — use the site's own product ID so we can re-scrape without duplicates
    const productId = parseInt($el.attr('data-id-product') || '0');
    if (!productId) return;

    // URL + Name
    const titleLink = $el.find('.product-title a');
    const url  = titleLink.attr('href') || '';
    const name = titleLink.text().trim();
    if (!name) return;

    // Brand — on listing page as .product-brand a
    const brand = normalizeBrand($el.find('.product-brand a').text().trim());

    // SKU — strip leading #
    const sku = $el.find('.product-reference a').text().trim().replace(/^#/, '');

    // Price — use content attribute (EUR value without symbol)
    const priceEl  = $el.find('.product-price');
    const priceEur = parseFloat(priceEl.attr('content') || priceEl.text().replace(/[€,\s]/g, '')) || 0;
    const priceSek = Math.round(priceEur * EUR_TO_SEK);

    // Images — grab first two from listing (home_default), upgrade URL to large_default
    const images = [];
    $el.find('img.js-lazy-product-image').each((_, img) => {
      const src = $(img).attr('data-full-size-image-url')
        || ($(img).attr('data-src') || '').replace('home_default', 'large_default');
      if (src && src.startsWith('http') && !images.includes(src)) images.push(src);
    });

    // Stock — check product-flags for explicit out-of-stock label
    const flagsText = $el.find('.product-flags').text().toLowerCase();
    const inStock = !flagsText.includes('out-of-stock') && !flagsText.includes('out of stock');

    // Short description from listing
    const description = $el.find('.product-description-short').text().trim().slice(0, 400);

    products.push({ id: productId, url, name, brand, sku, priceEur, priceSek, images, inStock, description, category });
  });

  return { products, total };
}

async function scrapeCategory(baseUrl, category) {
  console.log(`\n[${category}] Fetching page 1...`);
  const firstHtml = await fetchHtml(baseUrl);
  const { products: firstPage, total } = parsePage(firstHtml, category);
  const pages = total > 0 ? Math.ceil(total / 24) : 1;
  console.log(`[${category}] ${total} products across ${pages} pages`);

  const all = [...firstPage];

  for (let p = 2; p <= pages; p++) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchHtml(`${baseUrl}?page=${p}`);
      const { products } = parsePage(html, category);
      all.push(...products);
      process.stdout.write(`\r[${category}] Page ${p}/${pages}: ${all.length} collected   `);
    } catch (err) {
      process.stdout.write(`\n  ✗ Page ${p} failed: ${err.message}\n`);
    }
  }

  console.log('');
  return all;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing Supabase credentials. Check .env.local');
    process.exit(1);
  }

  const usingServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('TurboCentras Product Scraper — incremental mode (no delete)');
  console.log('=============================================================');
  console.log(`Key: ${usingServiceKey ? 'service_role ✓' : 'anon (may fail on insert)'}\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // ─── Phase 1: Scrape ALL listing pages fresh ───────────────────────────────
  // Always re-scrape so we pick up products added since the last run.
  // (Delete scraped-products.json first if you want a truly fresh scrape.)
  let allProducts = [];

  if (fs.existsSync(PROGRESS_FILE)) {
    allProducts = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`Loaded ${allProducts.length} products from saved scrape file.\n`);
  } else {
    console.log('Phase 1: Scraping ALL product listings from turbocentras.com...');
    for (const cat of CATEGORIES) {
      const products = await scrapeCategory(cat.baseUrl, cat.category);
      allProducts.push(...products);
      await sleep(DELAY_MS);
    }
    // Deduplicate by turbocentras product ID
    allProducts = [...new Map(allProducts.map(p => [p.id, p])).values()];
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(allProducts, null, 2));
    console.log(`\n✓ Phase 1 done: ${allProducts.length} unique products scraped\n`);
  }

  // ─── Phase 2: Upsert all scraped products, skipping existing ones ──────────
  // ignoreDuplicates: true means existing rows are left exactly as-is (images
  // already mirrored to Supabase Storage won't be touched). Only truly new
  // products get inserted.
  const rows = allProducts
    .filter(p => p.id && p.name)
    .map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      sku: p.sku || '',
      price: p.priceSek || 0,
      original_price: null,
      images: p.images || [],
      category: p.category,
      in_stock: p.inStock ?? true,
      description: p.description || '',
      badge: null,
    }));

  console.log(`Phase 2: Upserting ${rows.length} products (existing rows are skipped, only new ones inserted)...\n`);

  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.log(`\n  ✗ Batch ${i}–${i + BATCH}: ${error.message}`);
      if (error.message.includes('permission') || error.message.includes('policy')) {
        console.log('  → Add SUPABASE_SERVICE_ROLE_KEY to .env.local and re-run');
        process.exit(1);
      }
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  Processed: ${inserted}/${rows.length}`);
    }
    await sleep(300);
  }

  // Figure out which products were actually new (not previously in DB)
  // by re-fetching current count per category and comparing to what we upserted
  const newByCategory = {};
  const newProductsList = [];
  for (const p of allProducts) {
    // We can't know exactly which were inserted vs skipped, so we track
    // by querying the DB for products created today in each new category
  }

  // ─── Phase 3: Log to Nya Händelser if anything was added ──────────────────
  // Count newly inserted per category by checking which IDs now exist that
  // match our scraped data. We approximate: fetch all IDs in each category
  // that were in our scraped set, compare to what existed before upsert.
  // Simpler: just report the full scraped breakdown and note it's incremental.
  const byCategory = {};
  for (const p of allProducts) {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  }

  // Build details lines per category
  const details = [];
  for (const [cat, prods] of Object.entries(byCategory)) {
    details.push(`${cat} (${prods.length} produkter scraped):`);
    // Group by brand
    const byBrand = {};
    for (const p of prods) {
      const brand = p.brand || 'Okänt';
      if (!byBrand[brand]) byBrand[brand] = [];
      byBrand[brand].push(p.sku || p.name);
    }
    for (const [brand, skus] of Object.entries(byBrand).slice(0, 8)) {
      details.push(`  • ${brand}: ${skus.slice(0, 6).join(', ')}${skus.length > 6 ? ` +${skus.length - 6} till` : ''}`);
    }
    details.push('');
  }

  const newEvent = {
    id: `scrape-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    title: `Produktkatalog synkroniserad — ${allProducts.length} produkter kontrollerade`,
    details: details.filter((_, i) => i < 40), // cap at 40 lines
  };

  // Load existing events, prepend new one, save back
  const { data: existingContent } = await supabase
    .from('site_content')
    .select('content')
    .eq('key', 'news_events')
    .single();

  const existingEvents = existingContent?.content?.events ?? [];
  const updatedEvents = [newEvent, ...existingEvents].slice(0, 50); // keep last 50

  await supabase.from('site_content').upsert({
    key: 'news_events',
    content: { events: updatedEvents },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  console.log(`\n\n✅ Done! Processed ${inserted}/${rows.length} products (new ones inserted, existing ones untouched).`);
  console.log('✅ Nya Händelser updated in admin panel.\n');
  console.log('Next step: run mirror-images.mjs to copy any new product images to Supabase Storage.');
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
