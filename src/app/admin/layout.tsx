"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Package, MessageSquare, Users, FileText, LogOut, Menu, X } from "lucide-react";

const navItems = [
  { href: "/admin",            label: "Översikt",     Icon: LayoutDashboard },
  { href: "/admin/products",   label: "Produkter",    Icon: Package },
  { href: "/admin/orders",     label: "Kontaktförfrågningar", Icon: MessageSquare },
  { href: "/admin/customers",  label: "Kunder",       Icon: Users },
  { href: "/admin/content",    label: "Innehåll",     Icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#fff" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: "#111",
        borderRight: "1px solid #1f1f1f",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : undefined,
      }} className="hidden md:flex">
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #1f1f1f" }}>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em" }}>
            TURBO<span style={{ color: "#ef4444" }}>TEKNIK</span>
          </span>
          <p style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Admin Panel</p>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "#888",
                  background: active ? "#1f1f1f" : "transparent",
                  textDecoration: "none",
                  borderLeft: active ? "3px solid #dc2626" : "3px solid transparent",
                }}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "1px solid #1f1f1f" }}>
          <button
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14 }}
          >
            <LogOut size={17} />
            Logga ut
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "#111", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 50 }}>
        <span style={{ fontSize: 16, fontWeight: 900 }}>TURBO<span style={{ color: "#ef4444" }}>TEKNIK</span></span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden" style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.7)" }} onClick={() => setSidebarOpen(false)}>
          <div style={{ width: 240, background: "#111", height: "100%", borderRight: "1px solid #1f1f1f" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "70px 10px 12px" }}>
              {navItems.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 2, fontSize: 14, fontWeight: active ? 600 : 400, color: active ? "#fff" : "#888", background: active ? "#1f1f1f" : "transparent", textDecoration: "none", borderLeft: active ? "3px solid #dc2626" : "3px solid transparent" }}>
                    <Icon size={17} />{label}
                  </Link>
                );
              })}
              <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginTop: 8 }}>
                <LogOut size={17} />Logga ut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 240, padding: "32px", minHeight: "100vh" }} className="md:ml-60 ml-0 mt-14 md:mt-0">
        {children}
      </main>
    </div>
  );
}
