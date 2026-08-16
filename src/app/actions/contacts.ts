"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logActivity";

export async function markContactHandled(
  contactId: string,
  contactName: string,
  handledByEmail: string,
  handledByName: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("contact_submissions").update({
    status: "handled",
    handled_by_email: handledByEmail,
    handled_by_name: handledByName,
    handled_at: new Date().toISOString(),
  }).eq("id", contactId);
  if (error) throw new Error(error.message);
  await logActivity(supabase, user!, {
    action_type: "contact_handled",
    entity_type: "contact",
    entity_id: contactId,
    entity_name: contactName,
    metadata: { handled_by_name: handledByName, handled_by_email: handledByEmail },
  });
  revalidatePath("/admin/orders");
}

export async function reopenContact(contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contact_submissions").update({
    status: "open",
    handled_by_email: null,
    handled_by_name: null,
    handled_at: null,
  }).eq("id", contactId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/orders");
}

export async function getAdminList(): Promise<{ email: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_log")
    .select("admin_email, admin_name")
    .order("created_at", { ascending: false })
    .limit(200);
  const seen = new Set<string>();
  const admins: { email: string; name: string }[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.admin_email)) {
      seen.add(row.admin_email);
      admins.push({ email: row.admin_email, name: row.admin_name || row.admin_email });
    }
  }
  return admins;
}
