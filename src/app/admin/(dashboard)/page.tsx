import { createServiceClient } from "@/lib/supabase/server";
import { Package, MessageSquare, Users, TrendingUp } from "lucide-react";
import StockFeed from "@/components/StockFeed";
import Link from "next/link";
import DashboardStatCards from "@/components/admin/DashboardStatCards";

const ADMIN_EMAIL = "yucellevon@gmail.com";

export default async function AdminDashboard() {
  const supabase = createServiceClient();

  const [
    { count: productCount },
    { count: openContactCount },
    { data: { users } },
    { data: recentContacts },
    { data: initialStockEvents },
    { data: cronState },
    { count: inStockCount },
    { count: outOfStockCount },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .or("status.is.null,status.eq.open"),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("stock_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("cron_state")
      .select("value, updated_at")
      .eq("key", "stock_check_cursor")
      .single(),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("in_stock", true),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("in_stock", false),
  ]);

  const customerCount = (users ?? []).filter(u => u.email !== ADMIN_EMAIL).length;

  const stats = [
    { label: "Produkter",           value: productCount ?? 0,    icon: "package",     color: "#3b82f6", href: "/admin/products" },
    { label: "Öppna förfrågningar", value: openContactCount ?? 0, icon: "message",    color: "#dc2626", href: "/admin/orders" },
    { label: "Kunder",              value: customerCount,         icon: "users",       color: "#10b981", href: "/admin/customers" },
    { label: "Omsättning",          value: "—",                  icon: "trending",    color: "#f59e0b", href: "/admin/orders" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Översikt</h1>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>Välkommen tillbaka.</p>

      {/* Stat cards — client component so hover works */}
      <DashboardStatCards stats={stats} />

      {/* Recent contact submissions */}
      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Senaste kontaktförfrågningar</h2>
          <Link href="/admin/orders" style={{ fontSize: 12, color: "#dc2626", textDecoration: "none" }}>Visa alla →</Link>
        </div>
        {recentContacts && recentContacts.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f1f1f" }}>
                  {["Namn", "E-post", "Ämne", "Datum", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#666", fontSize: 12, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentContacts.map((row: any) => {
                  const isHandled = row.status === "handled";
                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                      <td style={{ padding: "12px 12px", fontSize: 14 }}>{row.fornamn} {row.efternamn}</td>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#999" }}>{row.email}</td>
                      <td style={{ padding: "12px 12px", fontSize: 14, color: "#999" }}>{row.amne || "—"}</td>
                      <td style={{ padding: "12px 12px", fontSize: 13, color: "#555" }}>{new Date(row.created_at).toLocaleDateString("sv-SE")}</td>
                      <td style={{ padding: "12px 12px" }}>
                        {isHandled ? (
                          <span style={{ background: "#14532d", color: "#4ade80", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                            Hanterad{row.handled_by_name ? ` · ${row.handled_by_name}` : ""}
                          </span>
                        ) : (
                          <span style={{ background: "#1a1a00", color: "#f59e0b", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                            Öppen
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "#555", fontSize: 14, textAlign: "center", padding: "24px 0" }}>Inga förfrågningar ännu.</p>
        )}
      </div>

      {/* Live stock feed */}
      <StockFeed
        initialEvents={initialStockEvents ?? []}
        initialLastScan={cronState?.updated_at ?? null}
        inStockCount={inStockCount ?? 0}
        outOfStockCount={outOfStockCount ?? 0}
      />
    </div>
  );
}
