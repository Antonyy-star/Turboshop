import type { User } from "@supabase/supabase-js";

// Account roles live in app_metadata.role. Only the service role (our server) can
// write app_metadata — users cannot change it themselves, unlike user_metadata.
export type AccountRole = "admin" | "customer";

// Fallback for admin accounts created before roles existed (no app_metadata.role).
// Set ADMIN_EMAILS in the environment as a comma-separated list to override.
const FALLBACK_ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "yucellevon@gmail.com,antony9922@outlook.com")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

type AuthUser = Pick<User, "email" | "app_metadata"> & { banned_until?: string | null };

export function roleOf(user: AuthUser | null | undefined): AccountRole | null {
  const role = user?.app_metadata?.role;
  return role === "admin" || role === "customer" ? role : null;
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const role = roleOf(user);
  if (role) return role === "admin";
  return !!user.email && FALLBACK_ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// Every account that is not an admin is a customer. Self sign-up is turned off
// in Supabase, so only admins can create accounts (admin panel or dashboard).
// A database trigger also gives new accounts role "customer" automatically.
export function isCustomerUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const role = roleOf(user);
  return role === "customer" || (role === null && !isAdminUser(user));
}

export function isBlocked(user: AuthUser | null | undefined): boolean {
  const until = user?.banned_until;
  return !!until && new Date(until).getTime() > Date.now();
}
