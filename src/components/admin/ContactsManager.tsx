"use client";

import { useState, useEffect } from "react";
import { CheckCircle, RotateCcw, User, AlertCircle } from "lucide-react";
import { markContactHandled, reopenContact, getAdminList } from "@/app/actions/contacts";
import { useRouter } from "next/navigation";

interface Admin { email: string; name: string; }
interface Props { submissions: any[]; currentAdmin: Admin; }

function initials(name: string) {
  return name.split(/[\s@]/)[0].slice(0, 2).toUpperCase();
}

function AdminPicker({ contact, currentAdmin, onDone }: { contact: any; currentAdmin: Admin; onDone: () => void }) {
  const [admins, setAdmins]   = useState<Admin[]>([currentAdmin]);
  const [saving, setSaving]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    getAdminList().then(list => {
      const others = list.filter(a => a.email !== currentAdmin.email);
      setAdmins([currentAdmin, ...others]);
      setLoaded(true);
    });
  }, []);

  async function pick(admin: Admin) {
    if (saving) return;
    setSaving(admin.email);
    setError(null);
    try {
      const fullName = `${contact.fornamn ?? ""} ${contact.efternamn ?? ""}`.trim();
      await markContactHandled(contact.id, fullName || contact.email, admin.email, admin.name);
      onDone();
    } catch (e: any) {
      setError(e?.message ?? "Något gick fel — kontrollera att du kört SQL-migrationen i Supabase.");
      setSaving(null);
    }
  }

  return (
    <div style={{ background: "#0f0f0f", border: "1px solid #333", borderRadius: 10, padding: 16, marginTop: 12 }}>
      <p style={{ fontSize: 12, color: "#999", fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Vem hanterade detta? Klicka för att bekräfta.
      </p>

      {!loaded ? (
        <p style={{ fontSize: 13, color: "#555", padding: "8px 0" }}>Laddar admins...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {admins.map(a => {
            const isSaving = saving === a.email;
            const isDisabled = saving !== null;
            return (
              <button
                key={a.email}
                onClick={() => pick(a)}
                disabled={isDisabled}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: isSaving ? "#1a3a1a" : "#1a1a1a",
                  border: `1px solid ${isSaving ? "#22c55e" : "#2a2a2a"}`,
                  borderRadius: 8, padding: "10px 14px", cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled && !isSaving ? 0.5 : 1, transition: "all 0.15s", textAlign: "left",
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, color: "#fff" }}>
                  {initials(a.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                    {a.name}
                    {a.email === currentAdmin.email && <span style={{ color: "#666", fontWeight: 400, fontSize: 11 }}> (du)</span>}
                  </p>
                  <p style={{ fontSize: 11, color: "#555" }}>{a.email}</p>
                </div>
                {isSaving && (
                  <div style={{ width: 16, height: 16, border: "2px solid #22c55e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite", flexShrink: 0 }} />
                )}
                {!isSaving && !isDisabled && (
                  <CheckCircle size={15} color="#555" style={{ flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#1a0000", border: "1px solid #3a0000", borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
          <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#ef4444", lineHeight: 1.5 }}>{error}</p>
        </div>
      )}
    </div>
  );
}

export default function ContactsManager({ submissions, currentAdmin }: Props) {
  const [tab, setTab]           = useState<"open" | "handled">("open");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [reopening, setReopening] = useState<string | null>(null);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const router = useRouter();

  const open    = submissions.filter(s => !s.status || s.status === "open");
  const handled = submissions.filter(s => s.status === "handled");

  async function handleReopen(id: string) {
    setReopening(id);
    setReopenError(null);
    try {
      await reopenContact(id);
      router.refresh();
    } catch (e: any) {
      setReopenError(e?.message ?? "Något gick fel");
    }
    setReopening(null);
  }

  function handleDone() {
    setPickingId(null);
    router.refresh();
  }

  return (
    <div>
      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Kontaktförfrågningar</h1>
        <p style={{ color: "#666", fontSize: 14 }}>{open.length} öppna · {handled.length} hanterade</p>
      </div>

      {reopenError && (
        <div style={{ display: "flex", gap: 8, background: "#1a0000", border: "1px solid #3a0000", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "#ef4444" }}>{reopenError}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0f0f0f", border: "1px solid #1f1f1f", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {([["open", `Öppna (${open.length})`], ["handled", `Hanterade (${handled.length})`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setPickingId(null); }}
            style={{ background: tab === key ? "#dc2626" : "transparent", color: tab === key ? "#fff" : "#666", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {(tab === "open" ? open : handled).length === 0 ? (
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <p style={{ color: "#555", fontSize: 15 }}>{tab === "open" ? "Inga öppna förfrågningar." : "Inga hanterade förfrågningar ännu."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(tab === "open" ? open : handled).map((s: any) => (
            <div key={s.id} style={{ background: "#141414", border: `1px solid ${s.status === "handled" ? "#14532d55" : "#1f1f1f"}`, borderRadius: 12, padding: 20 }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600 }}>{s.fornamn} {s.efternamn}</p>
                  {s.foretag && <p style={{ color: "#888", fontSize: 13 }}>{s.foretag}</p>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {s.status === "handled" && (
                    <span style={{ background: "#14532d", color: "#4ade80", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>Hanterad</span>
                  )}
                  <span style={{ color: "#555", fontSize: 12 }}>{new Date(s.created_at).toLocaleString("sv-SE")}</span>
                </div>
              </div>

              {/* Fields */}
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
                <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <p style={{ color: "#555", fontSize: 11, marginBottom: 4 }}>Meddelande</p>
                  <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6 }}>{s.meddelande}</p>
                </div>
              )}

              {/* Who handled it (handled tab) */}
              {s.status === "handled" && s.handled_by_name && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0d1f0d", border: "1px solid #14532d55", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {initials(s.handled_by_name)}
                  </div>
                  <p style={{ fontSize: 12, color: "#4ade80" }}>
                    Hanterades av <strong>{s.handled_by_name}</strong>
                    {s.handled_at && <span style={{ color: "#555" }}> · {new Date(s.handled_at).toLocaleString("sv-SE")}</span>}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <a href={`mailto:${s.email}`} style={{ background: "#1f1f1f", color: "#ccc", textDecoration: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, border: "1px solid #2a2a2a" }}>
                  Svara via e-post
                </a>

                {s.status !== "handled" ? (
                  <button
                    onClick={() => setPickingId(pickingId === s.id ? null : s.id)}
                    style={{
                      background: pickingId === s.id ? "#1a2a1a" : "#0d1f0d",
                      color: "#4ade80",
                      border: `1px solid ${pickingId === s.id ? "#22c55e" : "#14532d"}`,
                      borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <CheckCircle size={14} />
                    {pickingId === s.id ? "Avbryt" : "Markera hanterad"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleReopen(s.id)}
                    disabled={reopening === s.id}
                    style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: reopening === s.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <RotateCcw size={13} />
                    {reopening === s.id ? "..." : "Återöppna"}
                  </button>
                )}
              </div>

              {/* Admin picker — opens below actions */}
              {pickingId === s.id && (
                <AdminPicker contact={s} currentAdmin={currentAdmin} onDone={handleDone} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
