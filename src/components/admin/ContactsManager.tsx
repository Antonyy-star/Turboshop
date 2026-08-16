"use client";

import { useState } from "react";
import { CheckCircle, RotateCcw, ChevronDown, X, User } from "lucide-react";
import { markContactHandled, reopenContact, getAdminList } from "@/app/actions/contacts";
import { useRouter } from "next/navigation";

interface Admin { email: string; name: string; }

interface Props {
  submissions: any[];
  currentAdmin: { email: string; name: string };
}

function HandlerPicker({ contact, currentAdmin, onDone }: { contact: any; currentAdmin: Admin; onDone: () => void }) {
  const [admins, setAdmins] = useState<Admin[]>([currentAdmin]);
  const [selected, setSelected] = useState<Admin>(currentAdmin);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedAdmins, setLoadedAdmins] = useState(false);

  async function openDropdown() {
    setOpen(v => !v);
    if (!loadedAdmins) {
      setLoading(true);
      const list = await getAdminList();
      // Merge: current admin always first, then others
      const others = list.filter(a => a.email !== currentAdmin.email);
      setAdmins([currentAdmin, ...others]);
      setLoadedAdmins(true);
      setLoading(false);
    }
  }

  async function confirm() {
    setSaving(true);
    const fullName = `${contact.fornamn ?? ""} ${contact.efternamn ?? ""}`.trim();
    await markContactHandled(contact.id, fullName || contact.email, selected.email, selected.name);
    onDone();
  }

  return (
    <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 10, padding: 16, marginTop: 12 }}>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>Vem hanterade detta?</p>

      {/* Dropdown */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <button
          onClick={openDropdown}
          style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: "#fff" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={13} color="#fff" />
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{selected.name}</p>
              <p style={{ fontSize: 11, color: "#555" }}>{selected.email}</p>
            </div>
          </div>
          <ChevronDown size={15} color="#666" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>

        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, zIndex: 50, overflow: "hidden" }}>
            {loading ? (
              <p style={{ padding: "12px 14px", fontSize: 13, color: "#666" }}>Laddar admins...</p>
            ) : (
              admins.map(a => (
                <button
                  key={a.email}
                  onClick={() => { setSelected(a); setOpen(false); }}
                  style={{ width: "100%", background: selected.email === a.email ? "#2a0000" : "transparent", border: "none", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: "1px solid #222" }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={14} color="#fff" />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{a.name}</p>
                    <p style={{ fontSize: 11, color: "#555" }}>{a.email}</p>
                  </div>
                  {selected.email === a.email && <CheckCircle size={14} color="#dc2626" style={{ marginLeft: "auto" }} />}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        onClick={confirm}
        disabled={saving}
        style={{ width: "100%", background: saving ? "#333" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
      >
        {saving ? "Sparar..." : "Bekräfta — markera som hanterad"}
      </button>
    </div>
  );
}

export default function ContactsManager({ submissions, currentAdmin }: Props) {
  const [tab, setTab] = useState<"open" | "handled">("open");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [reopening, setReopening] = useState<string | null>(null);
  const router = useRouter();

  const open    = submissions.filter(s => !s.status || s.status === "open");
  const handled = submissions.filter(s => s.status === "handled");

  async function handleReopen(id: string) {
    setReopening(id);
    await reopenContact(id);
    setReopening(null);
    router.refresh();
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Kontaktförfrågningar</h1>
        <p style={{ color: "#666", fontSize: 14 }}>{open.length} öppna · {handled.length} hanterade</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0f0f0f", border: "1px solid #1f1f1f", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {([["open", `Öppna (${open.length})`], ["handled", `Hanterade (${handled.length})`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ background: tab === key ? "#dc2626" : "transparent", color: tab === key ? "#fff" : "#666", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>
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
            <div key={s.id} style={{ background: "#141414", border: `1px solid ${s.status === "handled" ? "#14532d33" : "#1f1f1f"}`, borderRadius: 12, padding: 20 }}>
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

              {/* Handled by info */}
              {s.status === "handled" && s.handled_by_name && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0d1f0d", border: "1px solid #14532d44", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={12} color="#fff" />
                  </div>
                  <p style={{ fontSize: 12, color: "#4ade80" }}>
                    Hanterades av <strong>{s.handled_by_name}</strong>
                    {s.handled_at && <span style={{ color: "#555" }}> · {new Date(s.handled_at).toLocaleString("sv-SE")}</span>}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <a href={`mailto:${s.email}`} style={{ background: "#1f1f1f", color: "#ccc", textDecoration: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, border: "1px solid #2a2a2a" }}>
                  Svara via e-post
                </a>

                {s.status !== "handled" ? (
                  <button
                    onClick={() => setPickingId(pickingId === s.id ? null : s.id)}
                    style={{ background: pickingId === s.id ? "#1a2a1a" : "#0d1f0d", color: "#4ade80", border: `1px solid ${pickingId === s.id ? "#22c55e" : "#14532d"}`, borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <CheckCircle size={14} />
                    Markera hanterad
                  </button>
                ) : (
                  <button
                    onClick={() => handleReopen(s.id)}
                    disabled={reopening === s.id}
                    style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <RotateCcw size={13} />
                    {reopening === s.id ? "..." : "Återöppna"}
                  </button>
                )}
              </div>

              {/* Handler picker inline */}
              {pickingId === s.id && (
                <HandlerPicker
                  contact={s}
                  currentAdmin={currentAdmin}
                  onDone={() => { setPickingId(null); router.refresh(); }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
