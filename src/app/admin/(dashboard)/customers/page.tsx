import { createServiceClient } from "@/lib/supabase/server";
import { listAllUsers } from "@/lib/supabase/users";
import { isAdminUser, isBlocked } from "@/lib/auth/roles";
import CustomersManager, { type CustomerRow } from "@/components/admin/CustomersManager";
import DiscountCodesManager from "@/components/admin/DiscountCodesManager";

export const metadata = { title: "Kunder" };

export default async function AdminCustomers() {
  const supabase = createServiceClient();

  const [allUsers, { data: discountCodes }] = await Promise.all([
    listAllUsers(supabase),
    supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
  ]);

  const customers: CustomerRow[] = allUsers
    .filter(u => !isAdminUser(u))
    .map((u): CustomerRow => {
      const meta = u.user_metadata ?? {};
      return {
        id: u.id,
        name: meta.name || u.email?.split("@")[0] || "—",
        email: u.email ?? "",
        telefon: meta.telefon ?? "",
        foretag: meta.foretag ?? "",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        status: isBlocked(u) ? "blocked" : "active",
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Discounts can be assigned to any account, admins included.
  const discountCustomers = allUsers.map(u => ({
    email: u.email!,
    name: u.user_metadata?.name || u.email?.split("@")[0] || "—",
  }));

  return (
    <div>
      <CustomersManager customers={customers} />
      <DiscountCodesManager customers={discountCustomers} codes={discountCodes ?? []} />
    </div>
  );
}
