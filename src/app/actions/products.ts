"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logActivity";

function revalidateAll() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/activity");
  revalidatePath("/admin");
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

  // Validate required fields
  if (!data.name?.trim()) throw new Error("Produktnamn krävs.");
  if (!data.brand) throw new Error("Varumärke krävs.");
  if (!data.price || data.price <= 0) throw new Error("Ogiltigt pris.");

  const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await supabase.from("products").insert({
    id,
    name: data.name.trim(),
    brand: data.brand,
    category: data.category,
    sku: data.sku.trim(),
    price: data.price,
    images: data.images,
    description: data.description.trim(),
    in_stock: true,
  });
  if (error) throw new Error(error.message);

  revalidateAll();
  const { data: authData } = await supabase.auth.getUser();
  await logActivity(supabase, authData?.user, {
    action_type: "product_added",
    entity_type: "product",
    entity_id: id,
    entity_name: data.name,
    metadata: { brand: data.brand, category: data.category, price: data.price },
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

  // Validate
  if (!data.name?.trim()) throw new Error("Produktnamn krävs.");
  if (!data.price || data.price <= 0) throw new Error("Ogiltigt pris.");

  // Fetch old values for before/after logging
  const { data: oldProduct } = await supabase
    .from("products")
    .select("name, price, category, brand, in_stock")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("products").upsert({
    id,
    name: data.name.trim(),
    brand: data.brand,
    category: data.category,
    sku: data.sku.trim(),
    price: data.price,
    images: data.images,
    description: data.description.trim(),
    in_stock: data.in_stock,
  });
  if (error) throw new Error(error.message);

  revalidateAll();
  const { data: authData } = await supabase.auth.getUser();

  // Build meaningful before/after metadata
  const metadata: Record<string, any> = {};
  if (oldProduct) {
    if (oldProduct.price !== data.price) {
      metadata.pris_ändrat = `${Number(oldProduct.price).toLocaleString("sv-SE")} kr → ${data.price.toLocaleString("sv-SE")} kr`;
    }
    if (oldProduct.name !== data.name) {
      metadata.namn_ändrat = `"${oldProduct.name}" → "${data.name}"`;
    }
    if (oldProduct.in_stock !== data.in_stock) {
      metadata.lager = data.in_stock ? "I lager" : "Slut i lager";
    }
    if (oldProduct.brand !== data.brand) {
      metadata.varumärke = data.brand;
    }
    if (oldProduct.category !== data.category && data.category) {
      metadata.kategori = data.category;
    }
  } else {
    metadata.brand = data.brand;
    metadata.price = data.price;
  }

  await logActivity(supabase, authData?.user, {
    action_type: "product_updated",
    entity_type: "product",
    entity_id: id,
    entity_name: data.name,
    metadata,
  });
}

export async function updateProductStock(id: string, in_stock: boolean) {
  const supabase = await createClient();
  const { data: prod } = await supabase
    .from("products")
    .select("name, in_stock")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("products")
    .update({ in_stock })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateAll();
  const { data: authData } = await supabase.auth.getUser();
  await logActivity(supabase, authData?.user, {
    action_type: "product_updated",
    entity_type: "product",
    entity_id: id,
    entity_name: prod?.name ?? id,
    metadata: {
      lager_ändrat: `${prod?.in_stock ? "I lager" : "Slut"} → ${in_stock ? "I lager" : "Slut"}`,
    },
  });
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { data: prod } = await supabase
    .from("products")
    .select("name, brand, price")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateAll();
  const { data: authData } = await supabase.auth.getUser();
  await logActivity(supabase, authData?.user, {
    action_type: "product_deleted",
    entity_type: "product",
    entity_id: id,
    entity_name: prod?.name ?? id,
    metadata: prod ? { brand: prod.brand, price: prod.price } : {},
  });
}
