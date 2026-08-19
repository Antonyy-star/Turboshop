import { createServiceClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
import CreateCustomerForm from "@/components/admin/CreateCustomerForm";
import DiscountCodesManager from "@/components/admin/DiscountCodesManager";

const ADMIN_EMAIL = "yucellevon@gmail.com";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function AdminCustomers() {
  const supabase = createServiceClient();

  const [{ data: { users } }, { data: discountCodes }] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
  ]);

  const customers = (users ?? []).filter(u => u.email !== ADMIN_EMAIL);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Kunder</h1>
          <p style={{ color: "#666", fontSize: 14 }}>{customers.length} konton skapade</p>
        </div>
        <CreateCustomerForm />
      </div>

      {customers.length === 0 ? (
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <Users size={40} color="#333" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#555", fontSize: 15, marginBottom: 8 }}>Inga kunder ännu</p>
          <p style={{ color: "#444", fontSize: 13 }}>Klicka på "Skapa kund" för att lägga till ett nytt kundkonto.</p>
        </div>
      ) : (
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1f1f1f", background: "#0f0f0f" }}>
                {["Kund", "E-post", "Telefon", "Företag", "Skapad"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontSize: 12, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((u, idx) => {
                const meta = u.user_metadata ?? {};
                const name = meta.name || u.email?.split("@")[0] || "—";
                return (
                  <tr key={u.id} style={{ borderBottom: idx < customers.length - 1 ? "1px solid #1a1a1a" : "none" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", background: "#1f1f1f",
                          border: "1px solid #2a2a2a", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 12, fontWeight: 700,
                          color: "#dc2626", flexShrink: 0,
                        }}>
                          {initials(name) || "?"}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <a href={`mailto:${u.email}`} style={{ color: "#60a5fa", fontSize: 13, textDecoration: "none" }}>
                        {u.email}
                      </a>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#999" }}>
                      {meta.telefon || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#999" }}>
                      {meta.foretag || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#555" }}>
                      {new Date(u.created_at).toLocaleDateString("sv-SE")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DiscountCodesManager
        customers={customers.map(u => ({
          email: u.email!,
          name: u.user_metadata?.name || u.email?.split("@")[0] || "—",
        }))}
        codes={discountCodes ?? []}
      />
    </div>
  );
}
