"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { isCustomerUser } from "@/lib/auth/roles";
import { discountPercentOf } from "@/lib/pricing";

// The signed-in customer's discount, read from the auth server (not the
// browser's token) so a change in the admin panel applies at once.
export async function getMyDiscountPercent(): Promise<number> {
  const user = await getCurrentUser();
  if (!user || !isCustomerUser(user)) return 0;
  return discountPercentOf(user.app_metadata);
}
