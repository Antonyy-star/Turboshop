import { createServiceClient } from "@/lib/supabase/server";
import { listAllUsers } from "@/lib/supabase/users";
import { isAdminUser, isBlocked } from "@/lib/auth/roles";
import { customerProfile, displayName } from "@/lib/auth/profile";
import { discountPercentOf } from "@/lib/pricing";
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
      const p = customerProfile(u);
      return {
        id: u.id,
        ...p,
        name: p.name || u.email?.split("@")[0] || "—",
        email: u.email ?? "",
        anteckning: typeof u.app_metadata?.admin_note === "string" ? u.app_metadata.admin_note : "",
        rabatt: discountPercentOf(u.app_metadata) ? String(discountPercentOf(u.app_metadata)).replace(".", ",") : "",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        status: isBlocked(u) ? "blocked" : "active",
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Discounts can be assigned to any account, admins included.
  const discountCustomers = allUsers.map(u => ({
    email: u.email!,
    name: displayName(u) || "—",
  }));

  return (
    <div>
      <CustomersManager customers={customers} />
      <DiscountCodesManager customers={discountCustomers} codes={discountCodes ?? []} />
    </div>
  );
}
