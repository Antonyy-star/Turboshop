"use client";

import { useCustomerDiscount } from "@/context/PricingContext";
import { discountedPrice, formatKr, formatPercent } from "@/lib/pricing";

type Props = {
  amount: number;
  /** A shop-wide "was" price (sale), shown struck through when there is no customer discount. */
  original?: number | null;
  /** Classes for the price the customer pays. */
  className?: string;
  /** Classes for the struck-through price. */
  strikeClassName?: string;
  /** Show the "−10 %" label next to the price. */
  showBadge?: boolean;
};

// A product price. Signed-in customers with a discount see their own price,
// with the normal price struck through.
export default function Price({ amount, original, className, strikeClassName, showBadge = true }: Props) {
  const percent = useCustomerDiscount();
  const strike = strikeClassName ?? "text-gray-400 line-through font-normal text-[0.8em]";

  if (percent > 0) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={className}>{formatKr(discountedPrice(amount, percent))}</span>
        <span className={strike}>{formatKr(amount)}</span>
        {showBadge && (
          <span className="text-[11px] font-bold text-white bg-red-600 rounded px-1.5 py-0.5 leading-none self-center"
            title="Din kundrabatt">
            −{formatPercent(percent)}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={className}>{formatKr(amount)}</span>
      {original && original > amount ? <span className={strike}>{formatKr(original)}</span> : null}
    </span>
  );
}
