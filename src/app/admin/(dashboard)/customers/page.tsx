import { createClient } from "@/lib/supabase/server";
import { Users, Mail, Phone, Building2 } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export default async function AdminCustomers() {
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from("contact_submissions")
    .select("email, fornamn, efternamn, foretag, telefon, created_at")
    .order("created_at", { ascending: false });

  // Deduplicate by email — first submission per email = first contact date
  const customerMap = new Map<string, {
    email: string;
    name: string;
    foretag: string | null;
    telefon: string | null;
    first_contact: string;
    inquiry_count: number;
  }>();

  for (const row of submissions ?? []) {
    const email = row.email?.toLowerCase();
    if (!email) continue;
    const name = `${row.fornamn ?? ""} ${row.efternamn ?? ""}`.trim() || email;
    if (!customerMap.has(email)) {
      customerMap.set(email, {
        email: row.email,
        name,
        foretag: row.foretag || null,
        telefon: row.telefon || null,
        first_contact: row.created_at,
        inquiry_count: 1,
      });
    } else {
      const existing = customerMap.get(email)!;
      existing.inquiry_count++;
      if (row.created_at < existing.first_contact) {
        existing.first_contact = row.created_at;
      }
    }
  }

  const customers = Array.from(customerMap.values());

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Kunder</h1>
        <p style={{ color: "#666", fontSize: 14 }}>
          {customers.length} unika kunder baserat på kontaktförfrågningar
        </p>
      </div>

      {customers.length === 0 ? (
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <Users size={40} color="#333" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#555", fontSize: 15, marginBottom: 8 }}>Inga kunder ännu</p>
          <p style={{ color: "#444", fontSize: 13 }}>Kunder dyker upp här när de skickar en kontaktförfrågan via hemsidan.</p>
        </div>
      ) : (
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1f1f1f", background: "#0f0f0f" }}>
                {["Kund", "E-post", "Telefon", "Företag", "Första kontakt", "Förfrågningar"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontSize: 12, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => (
                <tr key={c.email} style={{ borderBottom: idx < customers.length - 1 ? "1px solid #1a1a1a" : "none" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1f1f1f", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#dc2626", flexShrink: 0 }}>
                        {initials(c.name).toUpperCase() || "?"}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <a href={`mailto:${c.email}`} style={{ color: "#60a5fa", fontSize: 13, textDecoration: "none" }}>
                      {c.email}
                    </a>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: "#999" }}>
                    {c.telefon || "—"}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: "#999" }}>
                    {c.foretag || "—"}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: "#555" }}>
                    {new Date(c.first_contact).toLocaleDateString("sv-SE")}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ background: "#1f1f1f", color: "#aaa", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, border: "1px solid #2a2a2a" }}>
                      {c.inquiry_count} {c.inquiry_count === 1 ? "förfrågan" : "förfrågningar"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: "#444" }}>
        Kunder registreras automatiskt när de skickar ett kontaktformulär. En e-postadress = en kund.
      </p>
    </div>
  );
}
