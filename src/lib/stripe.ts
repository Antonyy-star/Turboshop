import Stripe from "stripe";

// Card and Klarna payments through Stripe Checkout. Switched on by setting
// STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET for payment confirmations) in
// Vercel. Without them the checkout only offers invoice.

let client: Stripe | null = null;

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  client ??= new Stripe(key, { appInfo: { name: "TurboTeknik" } });
  return client;
}

/** Kronor -> öre, the unit Stripe expects for SEK. */
export const toOre = (kr: number) => Math.round(kr * 100);
