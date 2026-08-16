import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeArticle } from "@/lib/normalize";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!q) return NextResponse.json({ results: [] });

  // Fetch the full catalog — only real/admin products are stored in DB (not generated ones),
  // so this is a small set. Client-side normalization lets us strip dashes/spaces from
  // both the query and stored SKU before comparing, which ilike cannot do.
  const { data, error } = await supabase
    .from("products")
    .select("id,name,brand,sku,price,images,category,badge,in_stock")
    .limit(500);

  if (error) return NextResponse.json({ results: [] }, { status: 500 });

  const lower = q.toLowerCase();
  const normQ = normalizeArticle(q);

  const matches = (data ?? []).filter((p) => {
    const normSku = normalizeArticle(p.sku ?? "");
    const normName = normalizeArticle(p.name);
    const nameLower = p.name.toLowerCase();
    const brandLower = p.brand.toLowerCase();

    return (
      normSku.includes(normQ) ||
      normName.includes(normQ) ||
      nameLower.includes(lower) ||
      brandLower.includes(lower)
    );
  });

  const score = (p: { sku: string | null; name: string }) => {
    const normSku = normalizeArticle(p.sku ?? "");
    const nameLower = p.name.toLowerCase();
    if (normSku === normQ) return 0;
    if (normSku.startsWith(normQ)) return 1;
    if (nameLower === lower) return 2;
    if (nameLower.startsWith(lower)) return 3;
    if (normSku.includes(normQ)) return 4;
    if (nameLower.includes(lower)) return 5;
    return 6;
  };

  const sorted = matches.sort((a, b) => score(a) - score(b));

  return NextResponse.json({ results: sorted.slice(0, 8) });
}
