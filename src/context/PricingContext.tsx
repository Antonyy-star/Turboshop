"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyDiscountPercent } from "@/app/actions/pricing";

const PricingContext = createContext<number>(0);

// Loads the signed-in customer's discount and keeps it in step with sign-in
// and sign-out. Everyone else (visitors, admins) sees normal prices.
export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loadedFor: string | null | undefined; // user id the discount was loaded for

    // Fires once on page load (INITIAL_SESSION) and again on sign-in/sign-out.
    const { data } = createClient().auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      // Token refreshes and repeated events for the same user need no new lookup.
      if (userId === loadedFor && event !== "USER_UPDATED") return;
      loadedFor = userId;

      // Visitors and admins never have a discount: no server call.
      if (!session || session.user.app_metadata?.role === "admin") {
        setPercent(0);
        return;
      }
      // Deferred: server work must not run inside Supabase's auth callback.
      setTimeout(async () => {
        try {
          const p = await getMyDiscountPercent();
          if (!cancelled && loadedFor === userId) setPercent(p);
        } catch {
          if (!cancelled) setPercent(0);
        }
      }, 0);
    });
    return () => { cancelled = true; data.subscription.unsubscribe(); };
  }, []);

  return <PricingContext.Provider value={percent}>{children}</PricingContext.Provider>;
}

/** The signed-in customer's discount in percent (0 when none). */
export function useCustomerDiscount(): number {
  return useContext(PricingContext);
}
