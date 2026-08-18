import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Escape ilike special chars
function escapeIlike(s: string) {
  return s.replace(/[%_\\]/g, "\\$&");
}

// Strip dashes/spaces to normalize article numbers: "715910-0001-R" → "7159100001r"
function normalize(s: string) {
  return s.toLowerCase().replace(/[-\s./\\|_]+/g, "");
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!raw) return NextResponse.json({ results: [] });

  const esc = escapeIlike(raw);
  const lower = raw.toLowerCase();
  const normQ = normalize(raw);

  // Primary: server-side ilike across name, sku, brand
  const { data: primary } = await supabase
    .from("products")
    .select("id,name,brand,sku,price,images,category,badge,in_stock")
    .or(`name.ilike.%${esc}%,sku.ilike.%${esc}%,brand.ilike.%${esc}%`)
    .limit(30);

  let results = primary ?? [];

  // Secondary: if query looks like a bare article number (no dashes typed by user)
  // also search for normalized SKU matches — catches "7159100001" → "715910-0001-R"
  if (results.length < 5 && normQ.length >= 4 && !/\s/.test(raw)) {
    const { data: secondary } = await supabase
      .from("products")
      .select("id,name,brand,sku,price,images,category,badge,in_stock")
      .or(`name.ilike.%${esc}%,sku.ilike.%${esc}%,brand.ilike.%${esc}%`)
      .limit(100);

    // Filter secondary by normalized SKU match
    const extra = (secondary ?? []).filter((p) => {
      const ns = normalize(p.sku ?? "");
      const nn = normalize(p.name);
      return ns.includes(normQ) || nn.includes(normQ);
    });

    // Merge without duplicates
    const seen = new Set(results.map((r) => r.id));
    results = [...results, ...extra.filter((r) => !seen.has(r.id))];
  }

  // Score and sort
  const score = (p: { sku: string | null; name: string; brand: string }) => {
    const ns = normalize(p.sku ?? "");
    const nl = p.name.toLowerCase();
    const bl = p.brand.toLowerCase();
    if (ns === normQ || nl === lower) return 0;
    if (ns.startsWith(normQ) || nl.startsWith(lower) || bl === lower) return 1;
    if (ns.includes(normQ)) return 2;
    if (nl.includes(lower)) return 3;
    if (bl.includes(lower)) return 4;
    return 5;
  };

  results.sort((a, b) => score(a) - score(b));

  return NextResponse.json({ results: results.slice(0, 8) });
}
