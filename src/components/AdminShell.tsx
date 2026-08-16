"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Package, MessageSquare, Users, FileText, LogOut, ClipboardList } from "lucide-react";

const navItems = [
  { href: "/admin",            label: "Översikt",             Icon: LayoutDashboard },
  { href: "/admin/products",   label: "Produkter",            Icon: Package },
  { href: "/admin/orders",     label: "Kontaktförfrågningar", Icon: MessageSquare },
  { href: "/admin/customers",  label: "Kunder",               Icon: Users },
  { href: "/admin/content",    label: "Innehåll",             Icon: FileText },
  { href: "/admin/activity",   label: "Ändringslogg",         Icon: ClipboardList },
];

const SIDEBAR_W = 240;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#fff" }}>

      {/* Flow spacer — pushes main content past the fixed sidebar */}
      <div style={{ width: SIDEBAR_W, flexShrink: 0 }} />

      {/* Fixed sidebar */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: SIDEBAR_W, background: "#111",
        borderRight: "1px solid #1f1f1f",
        display: "flex", flexDirection: "column",
        zIndex: 50,
      }}>
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #1f1f1f" }}>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>
            TURBO<span style={{ color: "#ef4444" }}>TEKNIK</span>
          </span>
          <p style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Admin Panel</p>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                fontSize: 14, fontWeight: active ? 600 : 400,
                color: active ? "#fff" : "#888",
                background: active ? "#1f1f1f" : "transparent",
                textDecoration: "none",
                borderLeft: active ? "3px solid #dc2626" : "3px solid transparent",
              }}>
                <Icon size={17} />{label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "1px solid #1f1f1f" }}>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 8, background: "none",
            border: "none", cursor: "pointer", color: "#888", fontSize: 14,
          }}>
            <LogOut size={17} />Logga ut
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, padding: 32 }}>
        {children}
      </main>

    </div>
  );
}
