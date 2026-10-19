import AdminLoginForm from "./AdminLoginForm";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ fel?: string }> }) {
  const { fel } = await searchParams;
  const notice = fel === "behorighet"
    ? "Kontot du är inloggad med saknar adminbehörighet. Logga in med ett adminkonto."
    : null;
  return <AdminLoginForm notice={notice} />;
}
