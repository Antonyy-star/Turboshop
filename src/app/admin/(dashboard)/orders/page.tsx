import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import ContactsManager from "@/components/admin/ContactsManager";

export default async function AdminOrders() {
  const serviceSupabase = createServiceClient();
  const authSupabase = await createClient();

  const [{ data: submissions }, { data: { user } }] = await Promise.all([
    serviceSupabase.from("contact_submissions").select("*").order("created_at", { ascending: false }),
    authSupabase.auth.getUser(),
  ]);

  const currentAdmin = {
    email: user?.email ?? "",
    name: user?.user_metadata?.full_name || user?.email || "Admin",
  };

  return <ContactsManager submissions={submissions ?? []} currentAdmin={currentAdmin} />;
}
