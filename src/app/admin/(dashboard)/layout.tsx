import AdminShell from "@/components/AdminShell";
import { requireAdminPage } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <AdminShell>{children}</AdminShell>;
}
