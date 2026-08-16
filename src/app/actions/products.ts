"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProduct(data: {
  name: string;
  brand: string;
  category: string;
  sku: string;
  price: number;
  images: string[];
}) {
  const supabase = await createClient();
  const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await supabase.from("products").insert({
    id,
    ...data,
    in_stock: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/");
}
