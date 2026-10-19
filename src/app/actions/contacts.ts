"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { requireAdmin, adminDisplayName } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/roles";
import { listAllUsers } from "@/lib/supabase/users";

function revalidateAll() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

async function log(
  supabase: ReturnType<typeof createServiceClient>,
  admin: User,
  action_type: string,
  entity_id: string,
  entity_name: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from("activity_log").insert({
      admin_email: admin.email,
      admin_name: adminDisplayName(admin),
      action_type,
      entity_type: "contact",
      entity_id,
      entity_name,
      metadata,
    });
  } catch {
    // Logging must never block the action itself.
  }
}

export async function markContactHandled(
  contactId: string,
  contactName: string,
  handledByEmail: string,
  handledByName: string,
) {
  const admin = await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("contact_submissions").update({
    status: "handled",
    handled_by_email: handledByEmail,
    handled_by_name: handledByName,
    handled_at: new Date().toISOString(),
  }).eq("id", contactId);
  if (error) throw new Error(error.message);

  await log(supabase, admin, "contact_handled", contactId, contactName, {
    handled_by: handledByName,
    email: handledByEmail,
  });

  revalidateAll();
}

export async function reopenContact(contactId: string) {
  const admin = await requireAdmin();
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
  await log(supabase, admin, "contact_reopened", contactId, name);

  revalidateAll();
}

// Admin accounts only — customers must never appear in the "handled by" list.
export async function getAdminList(): Promise<{ email: string; name: string }[]> {
  const admin = await requireAdmin();
  try {
    const users = await listAllUsers(createServiceClient());
    return users.filter(u => isAdminUser(u)).map(u => ({ email: u.email!, name: adminDisplayName(u) }));
  } catch {
    return [{ email: admin.email!, name: adminDisplayName(admin) }];
  }
}
