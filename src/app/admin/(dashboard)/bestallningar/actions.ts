"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, adminDisplayName } from "@/lib/auth/session";
import { ORDER_STATUS, PAYMENT_STATUS, type OrderStatus, type PaymentStatus } from "@/lib/orders";

type Result = { ok: true } | { ok: false; error: string };

export async function updateOrder(
  orderId: string,
  input: { status: OrderStatus; payment_status: PaymentStatus; admin_note: string },
): Promise<Result> {
  const admin = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(orderId ?? "")) return { ok: false, error: "Beställningen hittades inte." };
  if (!(input?.status in ORDER_STATUS) || !(input?.payment_status in PAYMENT_STATUS)) {
    return { ok: false, error: "Ogiltig status." };
  }

  const supabase = createServiceClient();
  const { data: existing } = await supabase.from("orders")
    .select("order_number, status, payment_status, paid_at").eq("id", orderId).maybeSingle();
  if (!existing) return { ok: false, error: "Beställningen hittades inte." };

  const now = new Date().toISOString();
  const { error } = await supabase.from("orders").update({
    status: input.status,
    payment_status: input.payment_status,
    admin_note: (input.admin_note ?? "").trim().slice(0, 2000) || null,
    paid_at: input.payment_status === "paid" ? existing.paid_at ?? now : null,
    updated_at: now,
  }).eq("id", orderId);
  if (error) return { ok: false, error: "Ändringen kunde inte sparas. Försök igen." };

  const changes: Record<string, string> = {};
  if (existing.status !== input.status) changes.status = `${ORDER_STATUS[existing.status as OrderStatus].label} → ${ORDER_STATUS[input.status].label}`;
  if (existing.payment_status !== input.payment_status) changes.betalning = `${PAYMENT_STATUS[existing.payment_status as PaymentStatus]} → ${PAYMENT_STATUS[input.payment_status]}`;
  try {
    await supabase.from("activity_log").insert({
      admin_email: admin.email,
      admin_name: adminDisplayName(admin),
      action_type: "update_order",
      entity_type: "order",
      entity_id: orderId,
      entity_name: `Beställning #${existing.order_number}`,
      metadata: changes,
    });
  } catch { /* logging must never block the change */ }

  revalidatePath("/admin/bestallningar");
  revalidatePath("/admin");
  return { ok: true };
}
