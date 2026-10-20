import type { SupabaseClient } from "@supabase/supabase-js";

// Part and turbo numbers are written in many ways ("49377-06200", "49377 06200",
// "4937706200"). Searching compares them without spaces, dashes or dots.
export function normaliseNumber(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const MIN_QUERY_LENGTH = 3;

export type CatalogNumber = { t: string; n: string };
export type CatalogTurboPart = { type: string; ref: string; pid: string | null };

export type CatalogTurbo = {
  id: number;
  brand: string | null;
  series: string | null;
  model: string | null;
  reference: string | null;
  numbers: CatalogNumber[];
  parts: CatalogTurboPart[];
  product_id: string | null;
};

export type CatalogPart = {
  id: number;
  reference: string;
  type: string | null;
  brand: string | null;
  numbers: CatalogNumber[];
  product_id: string | null;
  turbos: { id: number; reference: string | null; brand: string | null; model: string | null; product_id: string | null }[];
  turboCount: number;
};

export type CatalogSearchResult = {
  query: string;
  turbos: CatalogTurbo[];
  turbosTotal: number;
  parts: CatalogPart[];
  partsTotal: number;
};

const TURBO_LIMIT = 300;
const PART_LIMIT = 60;
const TURBOS_PER_PART = 40;

// Rows whose number matches exactly come first, then numbers starting with the query.
function rank(search: string, n: string) {
  const tokens = search.split(" ");
  if (tokens.includes(n)) return 0;
  if (tokens.some(t => t.startsWith(n))) return 1;
  return 2;
}

export async function searchCatalog(supabase: SupabaseClient, query: string): Promise<CatalogSearchResult> {
  const q = query.trim().slice(0, 60);
  const n = normaliseNumber(q);
  const empty = { query: q, turbos: [], turbosTotal: 0, parts: [], partsTotal: 0 };
  if (n.length < MIN_QUERY_LENGTH) return empty;

  const [turboRes, partRes] = await Promise.all([
    supabase.from("catalog_turbos")
      .select("id, brand, series, model, reference, numbers, parts, product_id, search", { count: "exact" })
      .ilike("search", `%${n}%`)
      .order("reference")
      .limit(TURBO_LIMIT * 2),
    supabase.from("catalog_parts")
      .select("id, reference, type, brand, numbers, product_id, turbo_ids, search", { count: "exact" })
      .ilike("search", `%${n}%`)
      .order("reference")
      .limit(PART_LIMIT * 2),
  ]);
  if (turboRes.error) throw new Error(turboRes.error.message);
  if (partRes.error) throw new Error(partRes.error.message);

  const turbos = (turboRes.data ?? [])
    .sort((a, b) => rank(a.search, n) - rank(b.search, n))
    .slice(0, TURBO_LIMIT)
    .map(row => { const { search, ...t } = row; void search; return t as CatalogTurbo; });

  const partRows = (partRes.data ?? [])
    .sort((a, b) => rank(a.search, n) - rank(b.search, n))
    .slice(0, PART_LIMIT);

  // Describe the turbos each part fits (first few per part).
  const wanted = [...new Set(partRows.flatMap(p => (p.turbo_ids as number[]).slice(0, TURBOS_PER_PART)))];
  const turboInfo = new Map<number, CatalogPart["turbos"][number]>();
  for (let i = 0; i < wanted.length; i += 500) {
    const { data } = await supabase.from("catalog_turbos")
      .select("id, reference, brand, model, product_id")
      .in("id", wanted.slice(i, i + 500));
    for (const t of data ?? []) turboInfo.set(t.id, t);
  }

  const parts: CatalogPart[] = partRows.map(p => ({
    id: p.id,
    reference: p.reference,
    type: p.type,
    brand: p.brand,
    numbers: p.numbers ?? [],
    product_id: p.product_id,
    turboCount: (p.turbo_ids as number[]).length,
    turbos: (p.turbo_ids as number[]).slice(0, TURBOS_PER_PART)
      .map(id => turboInfo.get(id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .sort((a, b) => (a.reference ?? "").localeCompare(b.reference ?? "")),
  }));

  return {
    query: q,
    turbos,
    turbosTotal: turboRes.count ?? turbos.length,
    parts,
    partsTotal: partRes.count ?? parts.length,
  };
}

export type CatalogSuggestion =
  | { kind: "turbo"; label: string; detail: string; query: string }
  | { kind: "part"; label: string; detail: string; query: string };

// Short list for the search box while the visitor types.
export async function suggestCatalog(supabase: SupabaseClient, query: string): Promise<CatalogSuggestion[]> {
  const n = normaliseNumber(query);
  if (n.length < MIN_QUERY_LENGTH) return [];

  const [turbos, parts] = await Promise.all([
    supabase.from("catalog_turbos").select("reference, brand, series, model, search")
      .ilike("search", `%${n}%`).order("reference").limit(40),
    supabase.from("catalog_parts").select("reference, type, search")
      .ilike("search", `%${n}%`).order("reference").limit(20),
  ]);

  const t = (turbos.data ?? [])
    .sort((a, b) => rank(a.search, n) - rank(b.search, n))
    .slice(0, 6)
    .map(r => ({
      kind: "turbo" as const,
      label: r.reference ?? "",
      detail: [r.brand, r.series, r.model].filter(Boolean).join(" "),
      query: r.reference ?? "",
    }));
  const p = (parts.data ?? [])
    .sort((a, b) => rank(a.search, n) - rank(b.search, n))
    .slice(0, 4)
    .map(r => ({ kind: "part" as const, label: r.reference, detail: r.type ?? "", query: r.reference }));

  return [...t, ...p].filter(s => s.label);
}
