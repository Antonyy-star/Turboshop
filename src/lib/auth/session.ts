import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser, isBlocked, isCustomerUser } from "./roles";

// The signed-in user for this request, verified against Supabase Auth (not just
// read from the cookie). Cached so layouts, pages and actions share one lookup.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || isBlocked(data.user)) return null;
  return data.user;
});

export class AuthorizationError extends Error {
  constructor() {
    super("Du har inte behörighet att göra detta.");
    this.name = "AuthorizationError";
  }
}

// For server actions: every admin action must call this first. Server actions are
// public endpoints, so a layout check alone does not protect them.
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) throw new AuthorizationError();
  return user!;
}

// For admin pages and layouts.
export async function requireAdminPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isAdminUser(user)) redirect("/admin/login?fel=behorighet");
  return user;
}

// For customer pages. Admins are sent to the admin panel.
export async function requireCustomerPage(next = "/konto"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/logga-in?next=${encodeURIComponent(next)}`);
  if (isAdminUser(user)) redirect("/admin");
  if (!isCustomerUser(user)) redirect("/logga-in?fel=inaktivt");
  return user;
}

export function adminDisplayName(user: Pick<User, "email" | "user_metadata">): string {
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Admin";
}
