// Supabase returns at most 1000 rows per request, and .limit(10000) does not change that.
// fetchAll pages through a query until every row is loaded.
// Usage: await fetchAll((from, to) => supabase.from("products").select("id").order("id").range(from, to))
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://turboshop-sand.vercel.app").replace(/\/$/, "");
