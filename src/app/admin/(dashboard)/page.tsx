import { createClient } from "@/lib/supabase/server";
import { Package, MessageSquare, Users, TrendingUp } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: productCount },
    { count: openContactCount },
    { data: emailRows },
    { data: recentContacts },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .or("status.is.null,status.eq.open"),
    supabase.from("contact_submissions").select("email"),
    supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const customerCount = new Set(emailRows?.map((r: any) => r.email)).size;

  const stats = [
    { label: "Produkter",            value: productCount ?? 0,   Icon: Package,       color: "#3b82f6" },
    { label: "Öppna förfrågningar",  value: openContactCount ?? 0, Icon: MessageSquare, color: "#dc2626" },
    { label: "Kunder",               value: customerCount,        Icon: Users,         color: "#10b981" },
    { label: "Omsättning",           value: "—",                  Icon: TrendingUp,    color: "#f59e0b" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Översikt</h1>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>Välkommen tillbaka.</p>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
        {stats.map(({ label, value, Icon, color }) => (
          <div key={label} style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "#666", fontSize: 13 }}>{label}</span>
              <Icon size={18} color={color} />
            </div>
            <p style={{ fontSize: 28, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent contact submissions */}
      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Senaste kontaktförfrågningar</h2>
        {recentContacts && recentContacts.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
        ) : (
          <p style={{ color: "#555", fontSize: 14, textAlign: "center", padding: "24px 0" }}>Inga förfrågningar ännu.</p>
        )}
      </div>
    </div>
  );
}
