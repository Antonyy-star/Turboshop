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
  description: string;
}) {
  const supabase = await createClient();
  const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await supabase.from("products").insert({ id, ...data, in_stock: true });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function updateProduct(id: string, data: {
  name: string;
  brand: string;
  category: string;
  sku: string;
  price: number;
  images: string[];
  description: string;
  in_stock: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/");
}
