import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,name,brand,sku,price,images,category,badge,in_stock")
    .or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%`)
    .limit(24);

  if (error) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }

  const lower = q.toLowerCase();

  const score = (p: { sku?: string | null; name: string; brand: string }) => {
    const sku = (p.sku ?? "").toLowerCase();
    const name = p.name.toLowerCase();
    const brand = p.brand.toLowerCase();
    if (sku === lower) return 0;
    if (sku.startsWith(lower)) return 1;
    if (name === lower) return 2;
    if (name.startsWith(lower)) return 3;
    if (sku.includes(lower)) return 4;
    if (name.includes(lower)) return 5;
    if (brand.startsWith(lower)) return 6;
    return 7;
  };

  const sorted = (data ?? []).sort((a, b) => score(a) - score(b));

  return NextResponse.json({ results: sorted.slice(0, 8) });
}
