import { createClient } from "@/lib/supabase/server";
import ProductsManager from "@/components/admin/ProductsManager";

const PAGE_SIZE = 50;

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  const { page: pageStr, q, category } = await searchParams;
  const page   = Math.max(1, parseInt(pageStr ?? "1", 10));
  const search = (q ?? "").trim();

  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id,name,brand,sku,price,images,category,in_stock,badge,created_at", { count: "exact" });

  if (search) {
    query = (query as any).or(`name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%`);
  }
  if (category) {
    query = (query as any).eq("category", category);
  }

  const { data: products, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <ProductsManager
      initialProducts={products ?? []}
      totalCount={count ?? 0}
      page={page}
      totalPages={totalPages}
      search={search}
      category={category ?? ""}
    />
  );
}
