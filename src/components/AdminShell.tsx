"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Package, MessageSquare, Users, FileText, LogOut, Menu, X } from "lucide-react";

const navItems = [
  { href: "/admin",           label: "Översikt",             Icon: LayoutDashboard },
  { href: "/admin/products",  label: "Produkter",            Icon: Package },
  { href: "/admin/orders",    label: "Kontaktförfrågningar", Icon: MessageSquare },
  { href: "/admin/customers", label: "Kunder",               Icon: Users },
  { href: "/admin/content",   label: "Innehåll",             Icon: FileText },
];

const SIDEBAR_W = 240;
const TOPBAR_H  = 56;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <nav style={{ flex: 1, padding: "12px 10px" }}>
      {navItems.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} onClick={onNav} style={{
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
  );

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #1f1f1f" }}>
        <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>
          TURBO<span style={{ color: "#ef4444" }}>TEKNIK</span>
        </span>
        <p style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Admin Panel</p>
      </div>
      <NavLinks onNav={onNav} />
      <div style={{ padding: "12px 10px", borderTop: "1px solid #1f1f1f" }}>
        <button onClick={handleLogout} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "10px 12px", borderRadius: 8, background: "none",
          border: "none", cursor: "pointer", color: "#888", fontSize: 14,
        }}>
          <LogOut size={17} />Logga ut
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#fff" }}>

      {/*
        Flow spacer — desktop only.
        This normal-flow div reserves 240px so the main content
        naturally starts to the right of the fixed sidebar.
        No Tailwind/inline conflict possible.
      */}
      <div className="hidden md:block" style={{ width: SIDEBAR_W, flexShrink: 0 }} />

      {/* Fixed desktop sidebar — overlays the spacer */}
      <aside className="hidden md:flex" style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: SIDEBAR_W, background: "#111",
        borderRight: "1px solid #1f1f1f",
        flexDirection: "column", zIndex: 50,
      }}>
        <SidebarContent />
      </aside>

      {/* Fixed mobile top bar */}
      <div className="md:hidden" style={{
        position: "fixed", top: 0, left: 0, right: 0, height: TOPBAR_H,
        background: "#111", borderBottom: "1px solid #1f1f1f",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", zIndex: 50,
      }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: "#fff", whiteSpace: "nowrap" }}>
          TURBO<span style={{ color: "#ef4444" }}>TEKNIK</span>
        </span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}>
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.7)" }}
          className="md:hidden"
          onClick={() => setSidebarOpen(false)}>
          <div style={{ width: SIDEBAR_W, background: "#111", height: "100%", borderRight: "1px solid #1f1f1f" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ paddingTop: TOPBAR_H }}>
              <SidebarContent onNav={() => setSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main content — flex: 1 fills remaining width after the flow spacer */}
      <main style={{ flex: 1, minWidth: 0, padding: 32 }}>
        {/* Pushes content below the fixed mobile top bar */}
        <div className="md:hidden" style={{ height: TOPBAR_H }} />
        {children}
      </main>

    </div>
  );
}
