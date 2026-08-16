-- Contact form submissions
create table contact_submissions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  fornamn text,
  efternamn text,
  foretag text,
  registreringsskylt text,
  email text not null,
  telefon text,
  amne text,
  meddelande text
);

-- Products table
create table products (
  id text primary key,
  name text not null,
  brand text not null,
  price numeric not null,
  original_price numeric,
  sku text,
  images text[],
  badge text,
  description text,
  in_stock boolean default true,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table contact_submissions enable row level security;
alter table products enable row level security;

-- Allow anyone to insert contact submissions
create policy "Anyone can submit contact form"
  on contact_submissions for insert
  with check (true);

-- Allow authenticated admins to read submissions
create policy "Admins can read submissions"
  on contact_submissions for select
  using (auth.role() = 'authenticated');

-- Allow anyone to read products
create policy "Anyone can read products"
  on products for select
  using (true);

-- Allow authenticated admins to manage products
create policy "Admins can manage products"
  on products for all
  using (auth.role() = 'authenticated');
