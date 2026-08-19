"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Discount codes ─────────────────────────────────────────────────────────

export async function createDiscountCode(_: any, formData: FormData) {
  const supabase = createServiceClient();

  const code             = (formData.get("code")            as string ?? "").trim().toUpperCase();
  const type             = (formData.get("type")            as string ?? "percentage");
  const value            = parseFloat(formData.get("value") as string ?? "0");
  const min_order_value  = parseFloat(formData.get("min_order_value") as string ?? "0") || 0;
  const max_uses_raw     = (formData.get("max_uses") as string ?? "").trim();
  const max_uses         = max_uses_raw ? parseInt(max_uses_raw) : null;
  const expires_at_raw   = (formData.get("expires_at") as string ?? "").trim();
  const expires_at       = expires_at_raw || null;
  const applies_to       = (formData.get("applies_to") as string ?? "all");
  const applies_to_value = (formData.get("applies_to_value") as string ?? "").trim() || null;
  const assigned_to_email = (formData.get("assigned_to_email") as string ?? "").trim() || null;

  if (!code) return { error: "Kod krävs." };
  if (!value || value <= 0) return { error: "Värdet måste vara större än 0." };
  if (type === "percentage" && value > 100) return { error: "Procent kan inte överstiga 100." };

  const { error } = await supabase.from("discount_codes").insert({
    code, type, value, min_order_value, max_uses, expires_at,
    applies_to, applies_to_value, assigned_to_email,
  });

  if (error) return { error: error.message.includes("unique") ? "Koden finns redan." : error.message };
  revalidatePath("/admin/customers");
  return { success: true };
}

export async function toggleDiscountCode(id: string, active: boolean) {
  const supabase = createServiceClient();
  await supabase.from("discount_codes").update({ is_active: active }).eq("id", id);
  revalidatePath("/admin/customers");
}

export async function deleteDiscountCode(id: string) {
  const supabase = createServiceClient();
  await supabase.from("discount_codes").delete().eq("id", id);
  revalidatePath("/admin/customers");
}

// ── Customers ──────────────────────────────────────────────────────────────

export async function createCustomer(prevState: any, formData: FormData) {
  const name    = (formData.get("name")    as string ?? "").trim();
  const email   = (formData.get("email")   as string ?? "").trim();
  const password = (formData.get("password") as string ?? "").trim();
  const telefon = (formData.get("telefon") as string ?? "").trim();
  const foretag = (formData.get("foretag") as string ?? "").trim();

  if (!name || !email || !password) {
    return { error: "Namn, e-post och lösenord krävs." };
  }
  if (password.length < 6) {
    return { error: "Lösenordet måste vara minst 6 tecken." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, telefon, foretag },
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteCustomer(userId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return { success: true };
}
