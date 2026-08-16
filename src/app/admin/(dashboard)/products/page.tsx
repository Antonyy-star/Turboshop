import { createClient } from "@/lib/supabase/server";
import { realProducts } from "@/lib/realProducts";
import ProductsManager from "@/components/admin/ProductsManager";

export default async function AdminProducts() {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("products").select("id").limit(1);

  if (!existing || existing.length === 0) {
    // First-time seed: insert all real products
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
  } else {
    // Fix products seeded before the category column existed (category = null)
    await supabase
      .from("products")
      .update({ category: "Turboladdare" })
      .is("category", null)
      .in("id", realProducts.map(p => p.id));
  }

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return <ProductsManager initialProducts={products ?? []} />;
}
