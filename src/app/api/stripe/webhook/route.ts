import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Stripe tells us when a card/Klarna payment has gone through or was abandoned.
// Add this URL as a webhook endpoint in Stripe (events: checkout.session.completed,
// checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
// checkout.session.expired) and put its signing secret in STRIPE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "not configured" }, { status: 503 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = getStripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) return NextResponse.json({ received: true });

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      if (session.payment_status === "paid") {
        await supabase.from("orders")
          .update({ payment_status: "paid", paid_at: now, updated_at: now })
          .eq("id", orderId).neq("payment_status", "paid");
      }
      break;
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      await supabase.from("orders")
        .update({ payment_status: "failed", status: "cancelled", updated_at: now })
        .eq("id", orderId).eq("payment_status", "pending");
      break;
  }
  return NextResponse.json({ received: true });
}
