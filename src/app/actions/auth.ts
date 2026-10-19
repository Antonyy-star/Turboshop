"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { isAdminUser, isCustomerUser } from "@/lib/auth/roles";

export type AccountType = "admin" | "customer" | "none";

// Called by the login forms right after signing in, so the server decides which
// area the account may enter. Sign-in itself runs in the browser so Supabase's
// per-IP rate limits apply to each visitor, not to our server.
export async function getAccountType(): Promise<AccountType> {
  const user = await getCurrentUser();
  if (isAdminUser(user)) return "admin";
  if (isCustomerUser(user)) return "customer";
  return "none";
}
