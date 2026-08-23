#!/usr/bin/env node
// Scrapes the detailed specs panel from every product page on turbocentras.com
// and updates the Supabase products table with a `specs` JSONB column.
//
// Run:    node scripts/scrape-product-specs.mjs
// Resume: run again — progress saved to scripts/specs-progress.json

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { load } from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, 'specs-progress.json');
const PRODUCTS_FILE = path.join(__dirname, 'scraped-products.json');
const ENV_FILE = path.join(__dirname, '../.env.local');

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DELAY_MS = 400;
const CONCURRENCY = 3; // fetch 3 pages at a time
const SAVE_EVERY = 50; // save progress every N products

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
      if (i === retries - 1) return null;
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

function parseSpecsPanel(html) {
  if (!html) return null;
  const $ = load(html);

  // If the right-side panel doesn't exist (product may be a simple part), return null
  if (!$('.tc-info').length) return null;

  const specs = {
    series: null,
    model: null,
    technology: null,
    actuation: null,
    reference: null,
    turbo_numbers: [],
    replacements: [],
    interchangeable_with: [],
    turbo_parts: [],
  };

  // ── Basic info fields (not inside a scroll div, not a section header) ──────
  $('.tc-info').each((_, el) => {
    const $el = $(el);
    if ($el.closest('.tc-scroll-div').length) return;
    if ($el.find('h3.tc-info-title-product').length) return;

    const text = $el.clone().find('i').remove().end().text().replace(/\s+/g, ' ').trim();
    const val  = $el.find('.tc-sel').first().text().trim();
    if (!val) return;

    if (text.startsWith('Series:'))     specs.series     = val;
    else if (text.startsWith('Model:'))      specs.model      = val;
    else if (text.startsWith('Technology:')) specs.technology = val;
    else if (text.startsWith('Actuation:')) specs.actuation  = val;
    else if (text.startsWith('Reference:')) specs.reference  = val;
  });

  // ── Section-based parsing ──────────────────────────────────────────────────
  $('h3.tc-info-title-product').each((_, h3) => {
    const title     = $(h3).text().trim().toLowerCase();
    const scrollDiv = $(h3).closest('.tc-info').next('.tc-scroll-div');
    if (!scrollDiv.length) return;

    scrollDiv.find('.tc-info').each((_, item) => {
      const $item  = $(item);
      const text   = $item.clone().find('i').remove().end().text().replace(/\s+/g, ' ').trim();
      const val    = $item.find('.tc-sel').first().text().trim();

      if (title.includes('turbo number') || title.includes('numbers')) {
        // "OEM: 2009728/2933597" or "GHT: 852915-0007"
        const colon = text.indexOf(':');
        if (colon > -1) {
          const type   = text.slice(0, colon).trim();
          const number = val || text.slice(colon + 1).trim();
          if (number) specs.turbo_numbers.push({ type, number });
        }

      } else if (title.includes('replacement')) {
        // "Replacement for: 806709-0018 GT45"
        const cleaned = text.replace(/replacement for:/i, '').trim();
        if (cleaned) specs.replacements.push(cleaned);

      } else if (title.includes('interchangeable')) {
        if (text) specs.interchangeable_with.push(text);

      } else if (title.includes('turbo part') || title.includes('parts')) {
        const colon   = text.indexOf(':');
        const type    = colon > -1 ? text.slice(0, colon).trim() : text.trim();
        const sku     = $item.find('a').first().text().trim();
        const partUrl = $item.find('a').first().attr('href') || '';
        if (sku) specs.turbo_parts.push({ type, sku, url: partUrl });
      }
    });
  });

  // Return null if we got absolutely nothing useful
  const hasData = specs.series || specs.model || specs.turbo_numbers.length
    || specs.replacements.length || specs.turbo_parts.length;
  return hasData ? specs : null;
}

// Fetch + parse N urls concurrently, return array of results in same order
async function fetchBatch(items) {
  return Promise.all(
    items.map(async (item) => {
      const html  = await fetchHtml(item.url);
      const specs = parseSpecsPanel(html);
      return { id: item.id, specs };
    })
  );
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  console.log('TurboCentras Specs Scraper');
  console.log('==========================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // ── Step 0: ensure specs column exists ─────────────────────────────────────
  console.log('Checking if specs column exists...');
  const testId = 6543;
  const { error: colErr } = await supabase
    .from('products')
    .update({ specs: {} })
    .eq('id', testId);

  if (colErr && colErr.message.includes('specs')) {
    console.log('\n⚠ The `specs` column does not exist yet.');
    console.log('  Please run this SQL in your Supabase SQL Editor:');
    console.log('\n  ALTER TABLE products ADD COLUMN IF NOT EXISTS specs jsonb;\n');
    console.log('  Then run this script again.\n');
    console.log('  Supabase SQL Editor: https://supabase.com/dashboard/project/hudzxedyjaswddamapwf/sql');
    process.exit(1);
  }
  console.log('  ✓ specs column ready\n');

  // ── Step 1: Load product list ───────────────────────────────────────────────
  let products = [];

  if (fs.existsSync(PRODUCTS_FILE)) {
    const raw = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    products = raw.map(p => ({ id: p.id, url: p.url }));
    console.log(`Loaded ${products.length} products from scraped-products.json`);
  } else {
    // Fall back to querying Supabase for product IDs
    // We can reconstruct URLs from ID since turbocentras uses numeric IDs in URLs
    console.log('scraped-products.json not found — querying Supabase for product list...');
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('id');
      if (error || !data?.length) break;
      // Reconstruct URLs from product data stored during scrape
      data.forEach(p => {
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const catPath = p.category === 'Turboladdare' ? 'turbochargers'
          : p.category === 'CHRA' ? 'core-assemblies' : 'turbocharger-parts';
        products.push({ id: p.id, url: `https://www.turbocentras.com/en/${catPath}/${p.id}-${slug}` });
      });
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    console.log(`  ${products.length} products loaded from Supabase`);
  }

  // ── Step 2: Load or init progress ──────────────────────────────────────────
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    const done = Object.keys(progress).length;
    console.log(`Resuming: ${done}/${products.length} already done\n`);
  }

  const todo = products.filter(p => !progress[p.id]);
  const totalTodo = todo.length;
  const estMins = Math.round((totalTodo / CONCURRENCY) * (DELAY_MS / 1000) / 60);
  console.log(`Scraping specs for ${totalTodo} products (~${estMins} min at ${CONCURRENCY} concurrent)...\n`);

  // ── Step 3: Scrape in concurrent batches ───────────────────────────────────
  let scraped = 0;
  let withSpecs = 0;

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await fetchBatch(batch);

    for (const { id, specs } of results) {
      progress[id] = specs; // null if no specs panel found
      if (specs) withSpecs++;
      scraped++;
    }

    // Save progress periodically
    if (scraped % SAVE_EVERY === 0 || scraped === totalTodo) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
      process.stdout.write(`\r  Scraped: ${scraped}/${totalTodo} (${withSpecs} with specs)   `);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n\n✓ Scraping done. ${withSpecs} products have specs data.\n`);

  // ── Step 4: Update Supabase ─────────────────────────────────────────────────
  console.log('Updating Supabase...');

  const entries = Object.entries(progress).filter(([, specs]) => specs !== null);
  const BATCH = 100;
  let updated = 0;

  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH);
    // Update each product individually (no bulk update by different values in Supabase REST)
    await Promise.all(
      slice.map(([id, specs]) =>
        supabase.from('products').update({ specs }).eq('id', parseInt(id))
      )
    );
    updated += slice.length;
    process.stdout.write(`\r  Updated: ${updated}/${entries.length}   `);
    await sleep(200);
  }

  console.log(`\n\n✅ Done! ${updated} products updated with specs.\n`);
  console.log('You can delete scripts/specs-progress.json when satisfied.');
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
