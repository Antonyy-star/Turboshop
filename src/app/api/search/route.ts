import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeRef } from "@/lib/normalize";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function escapeIlike(s: string) {
  return s.replace(/[%_\\]/g, "\\$&");
}

const FIELDS = "id,name,brand,sku,price,images,category,badge,in_stock";

function rankScore(p: any, normQ: string, lower: string): number {
  const ns = normalizeRef(p.sku ?? "");
  const nl = (p.name ?? "").toLowerCase();
  const bl = (p.brand ?? "").toLowerCase();
  if (ns === normQ || nl === lower) return 0;
  if (ns.startsWith(normQ) || nl.startsWith(lower) || bl === lower) return 1;
  if (ns.includes(normQ)) return 2;
  if (nl.includes(lower)) return 3;
  if (bl.includes(lower)) return 4;
  return 5;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!raw) return NextResponse.json({ results: [] });

  const esc = escapeIlike(raw);
  const lower = raw.toLowerCase();
  const normQ = normalizeRef(raw);

  const seen = new Set<string>();
  const results: any[] = [];

  function add(rows: any[] | null) {
    for (const p of rows ?? []) {
      if (p?.id && !seen.has(p.id)) {
        seen.add(p.id);
        results.push(p);
      }
    }
  }

  // Phase 1: direct ilike — works for queries typed with correct formatting
  const [{ data: primary }, { data: oemDirect }] = await Promise.all([
    supabase.from("products").select(FIELDS)
      .or(`name.ilike.%${esc}%,sku.ilike.%${esc}%,brand.ilike.%${esc}%`)
      .limit(30),
    supabase.from("products").select(FIELDS)
      .filter("specs->>turbo_numbers", "ilike", `%${esc}%`)
      .limit(20),
  ]);
  add(primary);
  add(oemDirect);

  // Phase 2: normalized search via Postgres function
  // Handles "7159100001" → "715910-0001-R", "ga000016" → "GA-00-0016", etc.
  // Postgres normalizes BOTH the DB value and the query — no prefix guessing needed.
  if (normQ.length >= 2) {
    const { data: normResults } = await supabase.rpc("search_normalized", {
      query_norm: normQ,
      result_limit: 30,
    });
    add(normResults);
  }

  results.sort((a, b) => rankScore(a, normQ, lower) - rankScore(b, normQ, lower));
  return NextResponse.json({ results: results.slice(0, 8) });
}
