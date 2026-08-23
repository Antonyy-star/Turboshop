"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Package, MessageSquare, Users, FileText, LogOut, ClipboardList, Menu, X } from "lucide-react";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  function close() { setSidebarOpen(false); }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#fff", overflowX: "hidden", width: "100%" }}>
      <style>{`
        .adm-topbar  { display: none; }
        .adm-spacer  { width: ${SIDEBAR_W}px; flex-shrink: 0; }
        .adm-closebtn { display: none !important; }
        .adm-backdrop { display: none; }
        @media (max-width: 767px) {
          .adm-topbar {
            display: flex;
            position: fixed; top: 0; left: 0; right: 0; height: 56px;
            background: #111; border-bottom: 1px solid #1f1f1f;
            align-items: center; justify-content: space-between;
            padding: 0 16px; z-index: 60;
          }
          .adm-spacer { display: none !important; }
          .adm-sidebar {
            transform: translateX(-${SIDEBAR_W}px);
            transition: transform 0.25s ease !important;
          }
          .adm-sidebar.open { transform: translateX(0); }
          .adm-closebtn { display: flex !important; }
          .adm-backdrop {
            display: block;
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.7); z-index: 58;
          }
          .adm-main { padding: 72px 16px calc(24px + env(safe-area-inset-bottom)) !important; overflow-x: hidden; width: 100%; }
        }
      `}</style>

      {/* Mobile top bar — hidden on desktop via CSS */}
      <div className="adm-topbar">
        <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>
          TURBO<span style={{ color: "#ef4444" }}>TEKNIK</span>
        </span>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Öppna meny"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: 8, display: "flex", alignItems: "center" }}
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Flow spacer — hidden on mobile via CSS */}
      <div className="adm-spacer" />

      {/* Backdrop — rendered only when open; CSS hides it on desktop */}
      {sidebarOpen && <div className="adm-backdrop" onClick={close} />}

      {/* Fixed sidebar */}
      <aside
        className={`adm-sidebar${sidebarOpen ? " open" : ""}`}
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: SIDEBAR_W, background: "#111",
          borderRight: "1px solid #1f1f1f",
          display: "flex", flexDirection: "column",
          zIndex: 59,
        }}
      >
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>
              TURBO<span style={{ color: "#ef4444" }}>TEKNIK</span>
            </span>
            <p style={{ color: "#555", fontSize: 11, marginTop: 4 }}>Admin Panel</p>
          </div>
          {/* X button — shown only on mobile via CSS */}
          <button
            className="adm-closebtn"
            onClick={close}
            aria-label="Stäng meny"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#666", padding: 4, alignItems: "center", justifyContent: "center" }}
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={close} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                minHeight: 44,
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
            minHeight: 44,
          }}>
            <LogOut size={17} />Logga ut
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="adm-main" style={{ flex: 1, minWidth: 0, padding: 32 }}>
        {children}
      </main>
    </div>
  );
}
