"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = "yucellevon@gmail.com";

function revalidateAll() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

async function log(
  supabase: ReturnType<typeof createServiceClient>,
  action_type: string,
  entity_id: string,
  entity_name: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("activity_log").insert({
    admin_email: ADMIN_EMAIL,
    admin_name: ADMIN_EMAIL,
    action_type,
    entity_type: "contact",
    entity_id,
    entity_name,
    metadata,
  });
}

export async function markContactHandled(
  contactId: string,
  contactName: string,
  handledByEmail: string,
  handledByName: string,
) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("contact_submissions").update({
    status: "handled",
    handled_by_email: handledByEmail,
    handled_by_name: handledByName,
    handled_at: new Date().toISOString(),
  }).eq("id", contactId);
  if (error) throw new Error(error.message);

  await log(supabase, "contact_handled", contactId, contactName, {
    handled_by: handledByName,
    email: handledByEmail,
  });

  revalidateAll();
}

export async function reopenContact(contactId: string) {
  const supabase = createServiceClient();
  const { data: contact } = await supabase
    .from("contact_submissions")
    .select("fornamn, efternamn, email")
    .eq("id", contactId)
    .single();

  const { error } = await supabase.from("contact_submissions").update({
    status: "open",
    handled_by_email: null,
    handled_by_name: null,
    handled_at: null,
  }).eq("id", contactId);
  if (error) throw new Error(error.message);

  const name = contact ? `${contact.fornamn ?? ""} ${contact.efternamn ?? ""}`.trim() || contact.email : contactId;
  await log(supabase, "contact_reopened", contactId, name);

  revalidateAll();
}

export async function getAdminList(): Promise<{ email: string; name: string }[]> {
  const supabase = createServiceClient();
  try {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    return (users ?? []).map(u => ({
      email: u.email!,
      name: u.user_metadata?.full_name || u.user_metadata?.name || u.email!,
    }));
  } catch {
    return [{ email: ADMIN_EMAIL, name: ADMIN_EMAIL }];
  }
}
