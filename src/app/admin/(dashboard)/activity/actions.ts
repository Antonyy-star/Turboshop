"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";

export async function deleteActivityLog(id: string) {
  await requireAdmin();
  const supabase = createServiceClient();
  await supabase.from("activity_log").delete().eq("id", id);
  revalidatePath("/admin/activity");
  revalidatePath("/admin/products");
}
