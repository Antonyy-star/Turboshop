"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logActivity";

const sectionLabels: Record<string, string> = {
  hero: "Hero-sektion",
  feature1: "Bild + text sektion 1",
  feature2: "Bild + text sektion 2",
  why: "Varför TurboTeknik",
};

export async function saveContent(key: string, content: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_content").upsert({ key, content, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  await logActivity(supabase, user!, { action_type: "content_updated", entity_type: "content", entity_id: key, entity_name: sectionLabels[key] ?? key });
  revalidatePath("/");
}
