"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logActivity";

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
  const { data: { user } } = await supabase.auth.getUser();
  const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await supabase.from("products").insert({ id, ...data, in_stock: true });
  if (error) throw new Error(error.message);
  await logActivity(supabase, user!, { action_type: "product_added", entity_type: "product", entity_id: id, entity_name: data.name, metadata: { brand: data.brand, category: data.category, price: data.price } });
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
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("products").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, user!, { action_type: "product_updated", entity_type: "product", entity_id: id, entity_name: data.name, metadata: { brand: data.brand, price: data.price } });
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prod } = await supabase.from("products").select("name").eq("id", id).single();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, user!, { action_type: "product_deleted", entity_type: "product", entity_id: id, entity_name: prod?.name ?? id });
  revalidatePath("/admin/products");
  revalidatePath("/");
}
