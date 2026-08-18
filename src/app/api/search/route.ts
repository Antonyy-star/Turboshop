import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function escapeIlike(s: string) {
  return s.replace(/[%_\\]/g, "\\$&");
}

// Strips dashes/spaces/dots so "7159100001" matches "715910-0001-R"
function normalize(s: string) {
  return s.toLowerCase().replace(/[-\s./\\|_]+/g, "");
}

const FIELDS = "id,name,brand,sku,price,images,category,badge,in_stock";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!raw) return NextResponse.json({ results: [] });

  const esc = escapeIlike(raw);
  const lower = raw.toLowerCase();
  const normQ = normalize(raw);

  // Run name/sku/brand search AND OEM/turbo_numbers search in parallel
  const [{ data: primary }, { data: oemMatches }] = await Promise.all([
    supabase
      .from("products")
      .select(FIELDS)
      .or(`name.ilike.%${esc}%,sku.ilike.%${esc}%,brand.ilike.%${esc}%`)
      .limit(30),
    supabase
      .from("products")
      .select(FIELDS)
      .filter("specs->>turbo_numbers", "ilike", `%${esc}%`)
      .limit(20),
  ]);

  // Merge without duplicates
  const seen = new Set<string>();
  const results: any[] = [];
  for (const p of [...(primary ?? []), ...(oemMatches ?? [])]) {
    if (p?.id && !seen.has(p.id)) { seen.add(p.id); results.push(p); }
  }

  // Normalized secondary: user typed without dashes (e.g. "4720001" → "472-0001-R")
  // Fetch candidates by prefix, then normalize OEM numbers in JS
  if (results.length < 5 && normQ.length >= 4 && !/\s/.test(raw)) {
    // Use first 4 raw chars as DB prefix to narrow candidates
    const prefixEsc = escapeIlike(raw.slice(0, 4));
    const { data: candidates } = await supabase
      .from("products")
      .select(`${FIELDS},specs`)
      .or(`sku.ilike.${prefixEsc}%,name.ilike.%${prefixEsc}%`)
      .limit(200);

    const extra = (candidates ?? []).filter((p) => {
      if (seen.has(p.id)) return false;
      const nSku = normalize(p.sku ?? "");
      if (nSku.includes(normQ)) return true;
      // Check all alternate/OEM numbers in specs
      const nums: any[] = p.specs?.turbo_numbers ?? [];
      return nums.some((n: any) => normalize(n.number ?? "").includes(normQ));
    });

    for (const p of extra) {
      const { specs, ...rest } = p;
      if (!seen.has(rest.id)) { seen.add(rest.id); results.push(rest); }
    }
  }

  // Score: exact SKU/OEM match first, then starts-with, then contains
  const score = (p: any): number => {
    const ns = normalize(p.sku ?? "");
    const nl = p.name.toLowerCase();
    const bl = (p.brand ?? "").toLowerCase();
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
