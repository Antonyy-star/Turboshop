-- ============================================================
-- TurboTeknik — Supabase Schema (full reference)
-- Run this in the Supabase SQL Editor to create all tables.
-- Safe to re-run: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.
-- ============================================================

-- ── PRODUCTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  brand         text NOT NULL,
  category      text,
  price         numeric NOT NULL,
  original_price numeric,
  sku           text,
  images        text[],
  badge         text,
  description   text,
  in_stock      boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Add category column if upgrading from older schema
ALTER TABLE products ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist, recreate cleanly
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read products" ON products;
  DROP POLICY IF EXISTS "Admins can manage products" ON products;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Anyone can read products"
  ON products FOR SELECT USING (true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL USING (auth.role() = 'authenticated');


-- ── CONTACT SUBMISSIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_submissions (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at         timestamptz DEFAULT now(),
  fornamn            text,
  efternamn          text,
  foretag            text,
  registreringsskylt text,
  email              text NOT NULL,
  telefon            text,
  amne               text,
  meddelande         text,
  -- Status tracking (added via migration)
  status             text DEFAULT 'open',
  handled_by_email   text,
  handled_by_name    text,
  handled_at         timestamptz
);

-- Add status columns if upgrading from older schema
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS status text DEFAULT 'open';
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS handled_by_email text;
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS handled_by_name text;
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS handled_at timestamptz;

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can submit contact form" ON contact_submissions;
  DROP POLICY IF EXISTS "Admins can read submissions" ON contact_submissions;
  DROP POLICY IF EXISTS "Admins can update submissions" ON contact_submissions;
  DROP POLICY IF EXISTS "Admins can delete submissions" ON contact_submissions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read submissions"
  ON contact_submissions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update submissions"
  ON contact_submissions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete submissions"
  ON contact_submissions FOR DELETE USING (auth.role() = 'authenticated');


-- ── SITE CONTENT (CMS) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_content (
  key        text PRIMARY KEY,
  content    jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can read site content" ON site_content;
  DROP POLICY IF EXISTS "Admins can manage site content" ON site_content;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Public can read site content"
  ON site_content FOR SELECT USING (true);

CREATE POLICY "Admins can manage site content"
  ON site_content FOR ALL USING (auth.role() = 'authenticated');


-- ── ACTIVITY LOG ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email  text NOT NULL,
  admin_name   text,
  action_type  text NOT NULL,
  entity_type  text,
  entity_id    text,
  entity_name  text,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can read activity log" ON activity_log;
  DROP POLICY IF EXISTS "Admins can insert activity log" ON activity_log;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Admins can read activity log"
  ON activity_log FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert activity log"
  ON activity_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- ── STORAGE BUCKET ──────────────────────────────────────────
-- Run this separately if the product-images bucket doesn't exist:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-images', 'product-images', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "Public can view product images"
--   ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
--
-- CREATE POLICY "Admins can upload product images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
