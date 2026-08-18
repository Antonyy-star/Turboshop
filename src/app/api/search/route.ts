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

  function add(rows: any[] | null, stripSpecs = false) {
    for (const p of rows ?? []) {
      if (!p?.id || seen.has(p.id)) continue;
      seen.add(p.id);
      if (stripSpecs) {
        const { specs, ...rest } = p;
        results.push(rest);
      } else {
        results.push(p);
      }
    }
  }

  // ── Phase 1: direct ilike — name, sku, brand (exact formatting) ──────────
  const [{ data: primary }, { data: oemDirect }] = await Promise.all([
    supabase.from("products").select(FIELDS)
      .or(`name.ilike.%${esc}%,sku.ilike.%${esc}%,brand.ilike.%${esc}%`)
      .limit(30),
    // OEM/turbo_numbers with exact raw query
    supabase.from("products").select(FIELDS)
      .filter("specs->>turbo_numbers", "ilike", `%${esc}%`)
      .limit(20),
  ]);
  add(primary);
  add(oemDirect);

  // ── Phase 2: normalized reference search ─────────────────────────────────
  // Runs for any query without spaces and length ≥ 3.
  // Catches "7159100001" → "715910-0001-R", "770116" → "770116-0002", etc.
  // Also catches normalized OEM numbers: "7159100001" in turbo_numbers.
  if (normQ.length >= 3 && !/\s/.test(raw)) {
    // Use first 4 chars of normalized query as DB prefix to narrow candidates.
    // e.g. normQ="7159100001" → prefix="7159" → sku.ilike.7159% fetches "715910-0001-R"
    const prefixLen = Math.min(4, normQ.length);
    const prefixEsc = escapeIlike(normQ.slice(0, prefixLen));

    // Fetch candidates whose SKU starts with prefix, name contains prefix,
    // or whose turbo_numbers JSON contains the prefix.
    const { data: candidates } = await supabase
      .from("products")
      .select(`${FIELDS},specs`)
      .or(
        `sku.ilike.${prefixEsc}%,` +
        `sku.ilike.${escapeIlike(raw.slice(0, prefixLen))}%,` +
        `name.ilike.%${prefixEsc}%,` +
        `specs->>turbo_numbers.ilike.%${prefixEsc}%`
      )
      .limit(300);

    const extra = (candidates ?? []).filter((p: any) => {
      if (!p?.id || seen.has(p.id)) return false;
      // Normalized SKU match
      if (normalizeRef(p.sku ?? "").includes(normQ)) return true;
      // Normalized name match
      if (normalizeRef(p.name ?? "").includes(normQ)) return true;
      // Normalized OEM / turbo_numbers match
      const nums: any[] = p.specs?.turbo_numbers ?? [];
      return nums.some((n: any) => normalizeRef(String(n.number ?? "")).includes(normQ));
    });

    add(extra, true);
  }

  results.sort((a, b) => rankScore(a, normQ, lower) - rankScore(b, normQ, lower));
  return NextResponse.json({ results: results.slice(0, 8) });
}
