"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function createCustomer(prevState: any, formData: FormData) {
  const name    = (formData.get("name")    as string ?? "").trim();
  const email   = (formData.get("email")   as string ?? "").trim();
  const password = (formData.get("password") as string ?? "").trim();
  const telefon = (formData.get("telefon") as string ?? "").trim();
  const foretag = (formData.get("foretag") as string ?? "").trim();

  if (!name || !email || !password) {
    return { error: "Namn, e-post och lösenord krävs." };
  }
  if (password.length < 6) {
    return { error: "Lösenordet måste vara minst 6 tecken." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, telefon, foretag },
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteCustomer(userId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return { success: true };
}
