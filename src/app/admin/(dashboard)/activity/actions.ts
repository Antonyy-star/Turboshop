"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteActivityLog(id: string) {
  const supabase = createServiceClient();
  await supabase.from("activity_log").delete().eq("id", id);
  revalidatePath("/admin/activity");
  revalidatePath("/admin/products");
}
