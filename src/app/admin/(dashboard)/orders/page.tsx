import { createClient } from "@/lib/supabase/server";

export default async function AdminOrders() {
  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Kontaktförfrågningar</h1>
        <p style={{ color: "#666", fontSize: 14 }}>{submissions?.length ?? 0} förfrågningar totalt</p>
      </div>

      {submissions && submissions.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {submissions.map((s: any) => (
            <div key={s.id} style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600 }}>{s.fornamn} {s.efternamn}</p>
                  {s.foretag && <p style={{ color: "#888", fontSize: 13 }}>{s.foretag}</p>}
                </div>
                <span style={{ color: "#555", fontSize: 12 }}>{new Date(s.created_at).toLocaleString("sv-SE")}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "E-post", value: s.email },
                  { label: "Telefon", value: s.telefon || "—" },
                  { label: "Registreringsskylt", value: s.registreringsskylt || "—" },
                  { label: "Ämne", value: s.amne || "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ color: "#555", fontSize: 11, marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 13, color: "#ccc" }}>{value}</p>
                  </div>
                ))}
              </div>

              {s.meddelande && (
                <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 12 }}>
                  <p style={{ color: "#555", fontSize: 11, marginBottom: 4 }}>Meddelande</p>
                  <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6 }}>{s.meddelande}</p>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <a href={`mailto:${s.email}`} style={{ background: "#dc2626", color: "#fff", textDecoration: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500 }}>
                  Svara via e-post
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <p style={{ color: "#555", fontSize: 15 }}>Inga förfrågningar ännu.</p>
        </div>
      )}
    </div>
  );
}
