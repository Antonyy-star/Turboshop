import { createClient } from "@/lib/supabase/server";
import { realProducts } from "@/lib/realProducts";
import ProductsManager from "@/components/admin/ProductsManager";

export default async function AdminProducts() {
  const supabase = await createClient();
  const { data: dbProducts } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  const products = dbProducts && dbProducts.length > 0 ? dbProducts : realProducts;
  return <ProductsManager initialProducts={products} />;
}
