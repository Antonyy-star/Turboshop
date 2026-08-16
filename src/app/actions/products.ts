"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logActivity";

function revalidateAll() {
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
}

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
  revalidateAll();
  const { data: authData } = await supabase.auth.getUser();
  await logActivity(supabase, authData?.user, {
    action_type: "product_added", entity_type: "product", entity_id: id,
    entity_name: data.name, metadata: { brand: data.brand, category: data.category, price: data.price },
  });
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
  const { error } = await supabase.from("products").upsert({ id, ...data });
  if (error) throw new Error(error.message);
  revalidateAll();
  const { data: authData } = await supabase.auth.getUser();
  await logActivity(supabase, authData?.user, {
    action_type: "product_updated", entity_type: "product", entity_id: id,
    entity_name: data.name, metadata: { brand: data.brand, price: data.price },
  });
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { data: prod } = await supabase.from("products").select("name").eq("id", id).single();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAll();
  const { data: authData } = await supabase.auth.getUser();
  await logActivity(supabase, authData?.user, {
    action_type: "product_deleted", entity_type: "product", entity_id: id,
    entity_name: prod?.name ?? id,
  });
}
