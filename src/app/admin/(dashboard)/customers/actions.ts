"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = "yucellevon@gmail.com";

async function logActivity(
  supabase: ReturnType<typeof createServiceClient>,
  action_type: string,
  entity_type: string,
  entity_id: string,
  entity_name: string,
  metadata?: Record<string, unknown>,
) {
  await supabase.from("activity_log").insert({
    admin_email: ADMIN_EMAIL,
    admin_name: ADMIN_EMAIL,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    metadata: metadata ?? {},
  });
}

function revalidateAll() {
  revalidatePath("/admin/customers");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/products");
}

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

  await logActivity(supabase, "create_discount_code", "discount_code", code, code, {
    type,
    value,
    assigned_to: assigned_to_email ?? "global",
    applies_to,
  });

  revalidateAll();
  return { success: true };
}

export async function toggleDiscountCode(id: string, active: boolean) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("discount_codes").select("code").eq("id", id).single();
  await supabase.from("discount_codes").update({ is_active: active }).eq("id", id);

  await logActivity(supabase, active ? "activate_discount_code" : "deactivate_discount_code", "discount_code", id, data?.code ?? id, { is_active: active });

  revalidateAll();
}

export async function deleteDiscountCode(id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("discount_codes").select("code").eq("id", id).single();
  await supabase.from("discount_codes").delete().eq("id", id);

  await logActivity(supabase, "delete_discount_code", "discount_code", id, data?.code ?? id);

  revalidateAll();
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

  await logActivity(supabase, "create_customer", "customer", email, name, { email, foretag: foretag || null });

  revalidateAll();
  return { success: true };
}

export async function deleteCustomer(userId: string) {
  const supabase = createServiceClient();
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  await logActivity(supabase, "delete_customer", "customer", userId, user?.user?.email ?? userId);

  revalidateAll();
  return { success: true };
}
