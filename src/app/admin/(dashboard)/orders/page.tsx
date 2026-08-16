import { createClient } from "@/lib/supabase/server";
import ContactsManager from "@/components/admin/ContactsManager";

export default async function AdminOrders() {
  const supabase = await createClient();
  const [{ data: submissions }, { data: { user } }] = await Promise.all([
    supabase.from("contact_submissions").select("*").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const currentAdmin = {
    email: user?.email ?? "",
    name: user?.user_metadata?.full_name || user?.email || "Admin",
  };

  return <ContactsManager submissions={submissions ?? []} currentAdmin={currentAdmin} />;
}
