export async function logActivity(
  supabase: any,
  user: { email?: string | null; user_metadata?: any } | null | undefined,
  data: {
    action_type: string;
    entity_type?: string;
    entity_id?: string;
    entity_name?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    if (!user?.email) return;
    await supabase.from("activity_log").insert({
      admin_email: user.email,
      admin_name: user.user_metadata?.full_name || user.email,
      ...data,
      metadata: data.metadata ?? {},
    });
  } catch {
    // Never block the main action if logging fails
  }
}
