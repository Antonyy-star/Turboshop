import { createClient } from "@/lib/supabase/server";
import { realProducts } from "@/lib/realProducts";
import ProductsManager from "@/components/admin/ProductsManager";

export default async function AdminProducts() {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("products").select("id").limit(1);

  // Auto-seed real products into DB on first visit
  if (!existing || existing.length === 0) {
    await supabase.from("products").upsert(
      realProducts.map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        price: p.price,
        original_price: p.originalPrice,
        sku: p.sku,
        images: p.images,
        badge: p.badge,
        description: p.description,
        category: "Turboladdare",
        in_stock: true,
      })),
      { ignoreDuplicates: true }
    );
  }

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return <ProductsManager initialProducts={products ?? []} />;
}
