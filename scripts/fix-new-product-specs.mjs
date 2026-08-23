#!/usr/bin/env node
// Scrapes description + specs for Utrustning & Tuning products only.
// Updates ONLY description and specs columns — nothing else is touched.
// Run: node scripts/fix-new-product-specs.mjs

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { load } from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_FILE = path.join(__dirname, 'scraped-products.json');
const PROGRESS_FILE = path.join(__dirname, 'fix-specs-progress.json');
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
const DELAY_MS = 500;
const CONCURRENCY = 3;

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

function parseProductPage(html) {
  if (!html) return null;
  const $ = load(html);

  // ── Description from #description tab ────────────────────────────────────
  let description = '';
  const descEl = $('#description');
  if (descEl.length) {
    // Get text but preserve newlines between block elements
    descEl.find('br').replaceWith('\n');
    descEl.find('p, li, h2, h3, h4, tr').each((_, el) => {
      $(el).append('\n');
    });
    description = descEl.text().replace(/\n{3,}/g, '\n\n').trim().slice(0, 2000);
  }
  // Fallback: .product-description
  if (!description) {
    const fallback = $('.product-description');
    if (fallback.length) {
      description = fallback.text().replace(/\s+/g, ' ').trim().slice(0, 2000);
    }
  }

  // ── Specs from .tc-info panel (turbo products) ────────────────────────────
  let specs = null;
  if ($('.tc-info').length) {
    const s = {
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

    $('.tc-info').each((_, el) => {
      const $el = $(el);
      if ($el.closest('.tc-scroll-div').length) return;
      if ($el.find('h3.tc-info-title-product').length) return;

      const text = $el.clone().find('i').remove().end().text().replace(/\s+/g, ' ').trim();
      const val  = $el.find('.tc-sel').first().text().trim();
      if (!val) return;

      if (text.startsWith('Series:'))      s.series     = val;
      else if (text.startsWith('Model:'))       s.model      = val;
      else if (text.startsWith('Technology:'))  s.technology = val;
      else if (text.startsWith('Actuation:'))   s.actuation  = val;
      else if (text.startsWith('Reference:'))   s.reference  = val;
    });

    $('h3.tc-info-title-product').each((_, h3) => {
      const title     = $(h3).text().trim().toLowerCase();
      const scrollDiv = $(h3).closest('.tc-info').next('.tc-scroll-div');
      if (!scrollDiv.length) return;

      scrollDiv.find('.tc-info').each((_, item) => {
        const $item = $(item);
        const text  = $item.clone().find('i').remove().end().text().replace(/\s+/g, ' ').trim();
        const val   = $item.find('.tc-sel').first().text().trim();

        if (title.includes('turbo number') || title.includes('numbers')) {
          const colon = text.indexOf(':');
          if (colon > -1) {
            const type   = text.slice(0, colon).trim();
            const number = val || text.slice(colon + 1).trim();
            if (number) s.turbo_numbers.push({ type, number });
          }
        } else if (title.includes('replacement')) {
          const cleaned = text.replace(/replacement for:/i, '').trim();
          if (cleaned) s.replacements.push(cleaned);
        } else if (title.includes('interchangeable')) {
          if (text) s.interchangeable_with.push(text);
        } else if (title.includes('turbo part') || title.includes('parts')) {
          const colon = text.indexOf(':');
          const type  = colon > -1 ? text.slice(0, colon).trim() : text.trim();
          const sku   = $item.find('a').first().text().trim();
          const url   = $item.find('a').first().attr('href') || '';
          if (sku) s.turbo_parts.push({ type, sku, url });
        }
      });
    });

    const hasData = s.series || s.model || s.turbo_numbers.length
      || s.replacements.length || s.turbo_parts.length;
    if (hasData) specs = s;
  }

  // ── For equipment/tools: extract a basic features list as specs ───────────
  if (!specs) {
    const features = [];
    $('#description li, .product-description li').each((_, li) => {
      const text = $(li).text().replace(/\s+/g, ' ').trim();
      if (text) features.push(text);
    });
    if (features.length > 0) {
      specs = { features: features.slice(0, 20) };
    }
  }

  return { description, specs };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  console.log('Fix Description & Specs — Utrustning & Tuning products only');
  console.log('=============================================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // Load scraped products to get URLs
  if (!fs.existsSync(PRODUCTS_FILE)) {
    console.error('ERROR: scraped-products.json not found. Run scrape-turbocentras.mjs first.');
    process.exit(1);
  }

  const allScraped = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  const targets = allScraped.filter(p =>
    p.category === 'Utrustning' || p.category === 'Tuning'
  ).map(p => ({ id: p.id, url: p.url, name: p.name, category: p.category }));

  console.log(`Targets: ${targets.length} products (Utrustning + Tuning)`);

  // Load progress
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`Resuming: ${Object.keys(progress).length}/${targets.length} already done\n`);
  }

  const todo = targets.filter(p => !progress[p.id]);
  console.log(`To process: ${todo.length} products\n`);

  if (todo.length === 0) {
    console.log('All products already processed. Running DB update...\n');
  } else {
    let scraped = 0;
    let withDesc = 0;
    let withSpecs = 0;

    for (let i = 0; i < todo.length; i += CONCURRENCY) {
      const batch = todo.slice(i, i + CONCURRENCY);

      await Promise.all(batch.map(async (product) => {
        const html = await fetchHtml(product.url);
        const result = parseProductPage(html);
        progress[product.id] = result ?? { description: '', specs: null };
        if (result?.description) withDesc++;
        if (result?.specs) withSpecs++;
        scraped++;
      }));

      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
      process.stdout.write(`\r  Scraped: ${scraped}/${todo.length} | desc: ${withDesc} | specs: ${withSpecs}   `);

      await sleep(DELAY_MS);
    }

    console.log(`\n\n✓ Scraping done. ${withDesc} with description, ${withSpecs} with specs.\n`);
  }

  // Update Supabase — ONLY description and specs, nothing else
  console.log('Updating Supabase (description + specs only)...');
  const entries = Object.entries(progress);
  let updated = 0;
  let errors = 0;

  for (const [id, data] of entries) {
    if (!data) continue;
    const updateData = {};
    if (data.description) updateData.description = data.description;
    if (data.specs) updateData.specs = data.specs;
    if (Object.keys(updateData).length === 0) continue;

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', parseInt(id));

    if (error) {
      errors++;
      console.log(`\n  ✗ id=${id}: ${error.message}`);
    } else {
      updated++;
    }

    if (updated % 20 === 0) {
      process.stdout.write(`\r  Updated: ${updated}/${entries.length}   `);
    }
  }

  console.log(`\n\n✅ Done! ${updated} products updated, ${errors} errors.`);
  if (errors === 0) console.log('You can delete scripts/fix-specs-progress.json when satisfied.');

  // Log to activity_log so it appears in Admin → Produkter → Nya Händelser
  const withSpecsCount = Object.values(progress).filter(d => d?.specs).length;
  const withDescCount  = Object.values(progress).filter(d => d?.description).length;

  await supabase.from('activity_log').insert({
    action_type: 'system_import',
    admin_email: 'yucellevon@gmail.com',
    entity_name: `Beskrivningar & specs uppdaterade — ${updated} Utrustning & Tuning-produkter`,
    metadata: {
      details: [
        `${withDescCount} produkter fick fullständig beskrivning`,
        `${withSpecsCount} produkter fick strukturerade specifikationer`,
        `Kategorier: Utrustning (98 st) och Tuning (34 st)`,
        errors > 0 ? `${errors} fel vid uppdatering` : 'Inga fel',
      ],
    },
  });
  console.log('✓ Logged to activity_log — visible in Admin → Produkter → Nya Händelser');
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
