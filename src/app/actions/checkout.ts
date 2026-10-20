"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomerUser } from "@/lib/auth/roles";
import { customerProfile } from "@/lib/auth/profile";
import { discountPercentOf, discountedPrice } from "@/lib/pricing";
import { getStripe, stripeEnabled, toOre } from "@/lib/stripe";
import { SITE_URL } from "@/lib/supabase/fetchAll";
import { MAX_LINE_QTY, MAX_ORDER_LINES, type OrderItem, type PaymentMethod } from "@/lib/orders";

type CartLine = { id: string; qty: number };
type PlaceOrderInput = { lines: CartLine[]; payment: PaymentMethod; reference?: string; message?: string };
type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: number; redirectUrl: string }
  | { ok: false; error: string };

// The address Stripe sends the customer back to: this site, or the local dev server.
async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (origin && host && (origin === `https://${host}` || origin === `http://${host}`)) return origin;
  return SITE_URL;
}

// Creates an order from the customer's cart. Prices, stock and the customer
// discount come from the database; the browser only says which products and
// how many.
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user || !isCustomerUser(user)) {
    return { ok: false, error: "Logga in med ditt kundkonto för att beställa." };
  }

  const payment: PaymentMethod = input?.payment === "card" ? "card" : "invoice";
  if (payment === "card" && !stripeEnabled()) {
    return { ok: false, error: "Kortbetalning är inte tillgänglig just nu. Välj faktura." };
  }

  // Merge duplicate lines and check the quantities.
  const qtyById = new Map<string, number>();
  for (const line of Array.isArray(input?.lines) ? input.lines : []) {
    const id = String(line?.id ?? "").trim();
    const qty = Math.floor(Number(line?.qty));
    if (!/^[\w-]{1,40}$/.test(id) || !Number.isFinite(qty) || qty < 1) continue;
    qtyById.set(id, Math.min(MAX_LINE_QTY, (qtyById.get(id) ?? 0) + qty));
  }
  if (qtyById.size === 0) return { ok: false, error: "Varukorgen är tom." };
  if (qtyById.size > MAX_ORDER_LINES) return { ok: false, error: `En beställning kan ha högst ${MAX_ORDER_LINES} olika produkter.` };

  const supabase = createServiceClient();
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, name, brand, sku, price, in_stock, images")
    .in("id", [...qtyById.keys()]);
  if (productError) return { ok: false, error: "Beställningen kunde inte skapas. Försök igen om en stund." };

  const byId = new Map((products ?? []).map(p => [String(p.id), p]));
  const missing = [...qtyById.keys()].filter(id => !byId.has(id));
  if (missing.length) {
    return { ok: false, error: "Någon produkt i varukorgen finns inte längre. Ta bort den och försök igen." };
  }

  const discount = discountPercentOf(user.app_metadata);
  const items: OrderItem[] = [...qtyById.entries()].map(([id, qty]) => {
    const p = byId.get(id)!;
    const unit = Number(p.price) || 0;
    const price = discountedPrice(unit, discount);
    return {
      product_id: id,
      sku: p.sku ?? "",
      name: p.name,
      brand: p.brand ?? "",
      image: p.images?.[0] ?? "",
      unit_price: unit,
      price,
      qty,
      line_total: price * qty,
      in_stock: p.in_stock !== false,
    };
  });
  if (items.some(i => i.unit_price <= 0)) {
    return { ok: false, error: "Någon produkt saknar pris. Kontakta oss så hjälper vi dig med beställningen." };
  }

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const total = items.reduce((s, i) => s + i.line_total, 0);
  const profile = customerProfile(user);

  const { data: order, error: insertError } = await supabase.from("orders").insert({
    user_id: user.id,
    customer: { ...profile, email: user.email ?? "" },
    items,
    subtotal,
    discount_percent: discount,
    discount_amount: subtotal - total,
    total,
    payment_method: payment,
    payment_status: payment === "card" ? "pending" : "unpaid",
    reference: (input.reference ?? "").trim().slice(0, 120) || null,
    message: (input.message ?? "").trim().slice(0, 2000) || null,
  }).select("id, order_number").single();
  if (insertError || !order) return { ok: false, error: "Beställningen kunde inte skapas. Försök igen om en stund." };

  revalidatePath("/admin/bestallningar");
  const done = `/kassa/klar?order=${order.id}`;

  if (payment === "invoice") {
    return { ok: true, orderId: order.id, orderNumber: order.order_number, redirectUrl: done };
  }

  // Card / Klarna: hand over to Stripe's hosted checkout.
  try {
    const origin = await siteOrigin();
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      currency: "sek",
      customer_email: user.email ?? undefined,
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_number: String(order.order_number) },
      line_items: items.map(i => ({
        quantity: i.qty,
        price_data: {
          currency: "sek",
          unit_amount: toOre(i.price),
          product_data: { name: [i.name, i.sku].filter(Boolean).join(" · ").slice(0, 250) },
        },
      })),
      success_url: `${origin}${done}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/kassa?avbruten=${order.id}`,
    });
    await supabase.from("orders").update({ stripe_session_id: session.id, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (!session.url) throw new Error("no checkout url");
    return { ok: true, orderId: order.id, orderNumber: order.order_number, redirectUrl: session.url };
  } catch {
    await supabase.from("orders").update({ payment_status: "failed", status: "cancelled", updated_at: new Date().toISOString() }).eq("id", order.id);
    return { ok: false, error: "Kortbetalningen kunde inte startas. Försök igen eller välj faktura." };
  }
}
