import type { User } from "@supabase/supabase-js";

// A customer's details (name, phone, company, address). Stored in
// app_metadata.profile, which only our server (service role) can write, so
// customers cannot change their own details. Older accounts kept them in
// user_metadata, which is used as a fallback until an admin saves them.
export type CustomerProfile = {
  name: string;
  telefon: string;
  foretag: string;
  orgnr: string;
  adress: string;
  postnummer: string;
  ort: string;
};

export const PROFILE_KEYS = ["name", "telefon", "foretag", "orgnr", "adress", "postnummer", "ort"] as const;

type AnyUser = Pick<User, "app_metadata" | "user_metadata"> | null | undefined;

export function customerProfile(user: AnyUser): CustomerProfile {
  const stored = user?.app_metadata?.profile;
  const source: Record<string, unknown> =
    stored && typeof stored === "object" ? stored : (user?.user_metadata ?? {});
  const text = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
  return Object.fromEntries(PROFILE_KEYS.map(k => [k, text(source[k])])) as CustomerProfile;
}

// Name to show for any account: profile name, then the name an admin account
// has, then the part of the e-mail before the @.
export function displayName(user: (AnyUser & { email?: string | null }) | null | undefined): string {
  if (!user) return "";
  return customerProfile(user).name
    || (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "")
    || user.email?.split("@")[0]
    || "";
}
