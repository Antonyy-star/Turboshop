// Customer discounts: each customer can have a percentage off every product.
// Set by admins (Admin › Kunder) and stored in app_metadata.discount_percent,
// which only the server can write.

export const MAX_DISCOUNT_PERCENT = 90;

/** The customer's discount from their account data, 0 when none. */
export function discountPercentOf(appMetadata: Record<string, unknown> | null | undefined): number {
  const raw = Number(appMetadata?.discount_percent);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(raw, MAX_DISCOUNT_PERCENT);
}

/** Price after the discount, rounded to whole kronor. */
export function discountedPrice(price: number, percent: number): number {
  const p = Number(price) || 0;
  if (!percent) return p;
  return Math.round(p * (100 - percent) / 100);
}

export function formatKr(amount: number): string {
  return `${Math.round(Number(amount) || 0).toLocaleString("sv-SE")} kr`;
}

export function formatPercent(percent: number): string {
  return `${percent.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} %`;
}
