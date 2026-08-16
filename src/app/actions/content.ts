"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveContent(key: string, content: unknown) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("site_content")
    .upsert({ key, content, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);

  // Immediately invalidate the homepage and any other pages using this content
  revalidatePath("/");
}
