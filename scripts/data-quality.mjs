#!/usr/bin/env node
// READ-ONLY: scans the products table for data problems.
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const line of fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^﻿/, '');
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('products').select('*').order('id').range(from, from + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}
console.log('columns:', Object.keys(rows[0]).join(', '));
const c = (label, f) => { const hits = rows.filter(f); console.log(`${label}: ${hits.length}${hits.length ? '  e.g. ' + hits.slice(0, 5).map(r => r.id).join(',') : ''}`); return hits; };
console.log('total:', rows.length);
c('no images', r => !Array.isArray(r.images) || r.images.length === 0);
c('turbocentras (unmirrored) image links', r => (r.images ?? []).some(u => String(u).includes('turbocentras.com')));
c('price 0 / null', r => !r.price);
c('no sku', r => !r.sku);
c('placeholder name "Product N"', r => /^Product \d+$/.test(r.name ?? ''));
c('brand Okänt', r => r.brand === 'Okänt');
c('no category', r => !r.category);
c('no description', r => !r.description);
c('in stock', r => r.in_stock === true);
if ('specs' in rows[0]) c('no specs', r => !r.specs || Object.keys(r.specs).length === 0);
const cats = {}; rows.forEach(r => { cats[r.category ?? '(none)'] = (cats[r.category ?? '(none)'] ?? 0) + 1; });
console.log('categories:', JSON.stringify(Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 25)));
