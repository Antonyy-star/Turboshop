"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, adminDisplayName } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/roles";
import { passwordProblem } from "@/lib/auth/messages";

type Service = ReturnType<typeof createServiceClient>;
type Result = { ok: true } | { ok: false; error: string };

async function logActivity(
  supabase: Service,
  admin: User,
  action_type: string,
  entity_type: string,
  entity_id: string,
  entity_name: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await supabase.from("activity_log").insert({
      admin_email: admin.email,
      admin_name: adminDisplayName(admin),
      action_type,
      entity_type,
      entity_id,
      entity_name,
      metadata: metadata ?? {},
    });
  } catch {
    // Logging must never block the action itself.
  }
}

function revalidateAll() {
  revalidatePath("/admin/customers");
  revalidatePath("/admin/activity");
  revalidatePath("/admin");
}

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// ── Discount codes ─────────────────────────────────────────────────────────

export async function createDiscountCode(_: unknown, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createServiceClient();

  const code              = str(formData, "code").toUpperCase();
  const type              = str(formData, "type") === "fixed" ? "fixed" : "percentage";
  const value             = parseFloat(str(formData, "value") || "0");
  const min_order_value   = parseFloat(str(formData, "min_order_value") || "0") || 0;
  const max_uses_raw      = str(formData, "max_uses");
  const max_uses          = max_uses_raw ? parseInt(max_uses_raw, 10) : null;
  const expires_at        = str(formData, "expires_at") || null;
  const applies_to        = str(formData, "applies_to") || "all";
  const applies_to_value  = str(formData, "applies_to_value") || null;
  const assigned_to_email = str(formData, "assigned_to_email").toLowerCase() || null;

  if (!code) return { error: "Kod krävs." };
  if (!value || value <= 0) return { error: "Värdet måste vara större än 0." };
  if (type === "percentage" && value > 100) return { error: "Procent kan inte överstiga 100." };

  const { error } = await supabase.from("discount_codes").insert({
    code, type, value, min_order_value, max_uses, expires_at,
    applies_to, applies_to_value, assigned_to_email,
  });

  if (error) return { error: error.message.includes("unique") ? "Koden finns redan." : error.message };

  await logActivity(supabase, admin, "create_discount_code", "discount_code", code, code, {
    type,
    value,
    assigned_to: assigned_to_email ?? "global",
    applies_to,
  });

  revalidateAll();
  return { success: true };
}

export async function toggleDiscountCode(id: string, active: boolean) {
  const admin = await requireAdmin();
  const supabase = createServiceClient();
  const { data } = await supabase.from("discount_codes").select("code").eq("id", id).single();
  await supabase.from("discount_codes").update({ is_active: active }).eq("id", id);

  await logActivity(supabase, admin, active ? "activate_discount_code" : "deactivate_discount_code", "discount_code", id, data?.code ?? id, { is_active: active });

  revalidateAll();
}

export async function deleteDiscountCode(id: string) {
  const admin = await requireAdmin();
  const supabase = createServiceClient();
  const { data } = await supabase.from("discount_codes").select("code").eq("id", id).single();
  await supabase.from("discount_codes").delete().eq("id", id);

  await logActivity(supabase, admin, "delete_discount_code", "discount_code", id, data?.code ?? id);

  revalidateAll();
}

// ── Customers ──────────────────────────────────────────────────────────────

export type CustomerInput = {
  name: string;
  email: string;
  telefon: string;
  foretag: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BLOCK_DURATION = "876000h"; // ~100 years; lifted with "none"

function cleanInput(input: CustomerInput) {
  return {
    name: (input.name ?? "").trim().slice(0, 120),
    email: (input.email ?? "").trim().toLowerCase(),
    telefon: (input.telefon ?? "").trim().slice(0, 40),
    foretag: (input.foretag ?? "").trim().slice(0, 120),
  };
}

function inputProblem(c: ReturnType<typeof cleanInput>): string | null {
  if (!c.name) return "Ange kundens namn.";
  if (!c.email) return "Ange kundens e-postadress.";
  if (!EMAIL_RE.test(c.email)) return "E-postadressen ser inte giltig ut.";
  return null;
}

function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already been registered") || m.includes("already registered") || m.includes("email_exists")) {
    return "Det finns redan ett konto med den e-postadressen.";
  }
  if (m.includes("password")) return "Lösenordet godkändes inte. Välj ett längre lösenord med bokstäver och siffror.";
  if (m.includes("email")) return "E-postadressen godkändes inte.";
  return "Något gick fel: " + message;
}

// Loads the account and makes sure it is a customer, never an admin.
async function loadCustomer(supabase: Service, userId: string): Promise<User | null> {
  if (typeof userId !== "string" || !userId) return null;
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user || isAdminUser(data.user)) return null;
  return data.user;
}

function nameOf(user: User) {
  return user.user_metadata?.name || user.email || user.id;
}

export async function createCustomer(input: CustomerInput, password: string): Promise<Result> {
  const admin = await requireAdmin();
  const c = cleanInput(input);
  const problem = inputProblem(c) ?? passwordProblem(password ?? "");
  if (problem) return { ok: false, error: problem };

  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: c.email,
    password,
    email_confirm: true,
    app_metadata: { role: "customer" },
    user_metadata: { name: c.name, telefon: c.telefon, foretag: c.foretag },
  });
  if (error || !data.user) return { ok: false, error: authErrorMessage(error?.message ?? "okänt fel") };

  await logActivity(supabase, admin, "create_customer", "customer", data.user.id, c.name, {
    email: c.email,
    foretag: c.foretag || null,
  });
  revalidateAll();
  return { ok: true };
}

export async function updateCustomer(userId: string, input: CustomerInput): Promise<Result> {
  const admin = await requireAdmin();
  const c = cleanInput(input);
  const problem = inputProblem(c);
  if (problem) return { ok: false, error: problem };

  const supabase = createServiceClient();
  const existing = await loadCustomer(supabase, userId);
  if (!existing) return { ok: false, error: "Kunden hittades inte." };

  const emailChanged = (existing.email ?? "").toLowerCase() !== c.email;
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ...(emailChanged ? { email: c.email, email_confirm: true } : {}),
    user_metadata: { ...existing.user_metadata, name: c.name, telefon: c.telefon, foretag: c.foretag },
  });
  if (error) return { ok: false, error: authErrorMessage(error.message) };

  // Keep personal discount codes attached when the login e-mail changes.
  if (emailChanged && existing.email) {
    await supabase.from("discount_codes")
      .update({ assigned_to_email: c.email })
      .ilike("assigned_to_email", existing.email.replace(/[%_\\]/g, "\\$&"));
  }

  await logActivity(supabase, admin, "update_customer", "customer", userId, c.name, {
    email: c.email,
    ...(emailChanged ? { previous_email: existing.email } : {}),
  });
  revalidateAll();
  return { ok: true };
}

export async function setCustomerPassword(userId: string, password: string): Promise<Result> {
  const admin = await requireAdmin();
  const problem = passwordProblem(password ?? "");
  if (problem) return { ok: false, error: problem };

  const supabase = createServiceClient();
  const existing = await loadCustomer(supabase, userId);
  if (!existing) return { ok: false, error: "Kunden hittades inte." };

  const { error } = await supabase.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: authErrorMessage(error.message) };

  await logActivity(supabase, admin, "reset_customer_password", "customer", userId, nameOf(existing));
  revalidateAll();
  return { ok: true };
}

// Gives login access to an account that has no role yet (created before roles
// existed). Admin accounts are never touched.
export async function activateCustomer(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  const supabase = createServiceClient();
  const existing = await loadCustomer(supabase, userId);
  if (!existing) return { ok: false, error: "Kunden hittades inte." };

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...existing.app_metadata, role: "customer" },
  });
  if (error) return { ok: false, error: authErrorMessage(error.message) };

  await logActivity(supabase, admin, "activate_customer", "customer", userId, nameOf(existing));
  revalidateAll();
  return { ok: true };
}

export async function setCustomerBlocked(userId: string, blocked: boolean): Promise<Result> {
  const admin = await requireAdmin();
  const supabase = createServiceClient();
  const existing = await loadCustomer(supabase, userId);
  if (!existing) return { ok: false, error: "Kunden hittades inte." };

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? BLOCK_DURATION : "none",
  });
  if (error) return { ok: false, error: authErrorMessage(error.message) };

  await logActivity(supabase, admin, blocked ? "block_customer" : "unblock_customer", "customer", userId, nameOf(existing));
  revalidateAll();
  return { ok: true };
}

export async function deleteCustomer(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  const supabase = createServiceClient();
  const existing = await loadCustomer(supabase, userId);
  if (!existing) return { ok: false, error: "Kunden hittades inte." };

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: authErrorMessage(error.message) };

  await logActivity(supabase, admin, "delete_customer", "customer", userId, nameOf(existing), {
    email: existing.email,
  });
  revalidateAll();
  return { ok: true };
}
