"use client";

import { createClient } from "@/lib/supabase/client";
import { getAccountType, type AccountType } from "@/app/actions/auth";
import { signInErrorMessage } from "@/lib/auth/messages";

export type SignInResult =
  | { ok: true; type: Exclude<AccountType, "none"> }
  | { ok: false; error: string };

// Signs in from the browser (so Supabase rate limits apply per visitor), then
// asks the server which area the account may use. Accounts without access are
// signed out again.
export async function signInAccount(email: string, password: string): Promise<SignInResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { ok: false, error: signInErrorMessage(error) };

  const type = await getAccountType().catch(() => "none" as const);
  if (type === "none") {
    await supabase.auth.signOut();
    return { ok: false, error: "Kontot är inte aktiverat för inloggning än. Kontakta oss så hjälper vi dig." };
  }
  return { ok: true, type };
}
