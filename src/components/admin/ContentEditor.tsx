"use client";

import { useState } from "react";
import { saveContent } from "@/app/actions/content";
import { X, Save, ImageIcon, FileText, Layers } from "lucide-react";

export type SiteContent = {
  hero: {
    eyebrow: string; heading: string; subtext: string;
    button1_label: string; button1_href: string;
    button2_label: string; button2_href: string;
  };
  feature1: { eyebrow: string; heading: string; body: string; button_label: string; button_href: string; image: string };
  feature2: { eyebrow: string; heading: string; body: string; button_label: string; button_href: string; image: string };
  why: { cards: [{ title: string; desc: string }, { title: string; desc: string }, { title: string; desc: string }] };
};

type SectionKey = keyof SiteContent;

const sectionMeta: { key: SectionKey; label: string; desc: string; Icon: any }[] = [
  { key: "hero",     label: "Hero-sektion",         desc: "Rubrik, undertext och knappar i hjältebilden", Icon: Layers },
  { key: "feature1", label: "Bild + text sektion 1", desc: "Text bredvid första bilden (text vänster, bild höger)", Icon: ImageIcon },
  { key: "feature2", label: "Bild + text sektion 2", desc: "Text bredvid andra bilden (bild vänster, text höger)", Icon: ImageIcon },
  { key: "why",      label: "Varför TurboTeknik",    desc: "De tre kortkortens titlar och beskrivningar", Icon: FileText },
];

const Input = ({ label, value, onChange, multiline = false, required = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; required?: boolean }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 6 }}>
      {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
    </label>
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
    ) : (
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
    )}
  </div>
);

export default function ContentEditor({ initialContent }: { initialContent: SiteContent }) {
  const [content, setContent]       = useState<SiteContent>(initialContent);
  const [editing, setEditing]       = useState<SectionKey | null>(null);
  const [draft, setDraft]           = useState<any>(null);
  const [saving, setSaving]         = useState(false);
  const [status, setStatus]         = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function openEdit(key: SectionKey) {
    setDraft(JSON.parse(JSON.stringify(content[key])));
    setEditing(key);
    setStatus(null);
  }

  function closeEdit() { setEditing(null); setDraft(null); }

  async function handleSave() {
    if (!editing || !draft) return;

    // Basic validation — no required string field empty
    const allStrings = (obj: any): string[] =>
      typeof obj === "string" ? [obj] : typeof obj === "object" && obj !== null
        ? Object.values(obj).flatMap(allStrings) : [];

    if (allStrings(draft).some(v => v.trim() === "")) {
      setStatus({ type: "error", msg: "Fyll i alla obligatoriska fält." });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await saveContent(editing, draft);
      setContent(prev => ({ ...prev, [editing]: draft }));
      setStatus({ type: "success", msg: "Sparat! Hemsidan uppdateras direkt." });
      setTimeout(closeEdit, 1500);
    } catch (e: any) {
      setStatus({ type: "error", msg: e?.message ?? "Något gick fel. Försök igen." });
    }
    setSaving(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Innehåll</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Redigera texter och bilder på hemsidan. Ändringar syns direkt för besökare.</p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {sectionMeta.map(({ key, label, desc, Icon }) => (
          <div key={key} style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <Icon size={20} color="#555" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{label}</p>
                <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{desc}</p>
              </div>
            </div>
            <button onClick={() => openEdit(key)}
              style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              Redigera
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {editing && draft && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={closeEdit}>
          <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #222" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{sectionMeta.find(s => s.key === editing)?.label}</h2>
              <button onClick={closeEdit} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Form fields */}
            <div style={{ padding: "24px" }}>

              {/* ── HERO ── */}
              {editing === "hero" && (
                <>
                  <Input label="Liten text ovan rubrik" value={draft.eyebrow} onChange={v => setDraft({ ...draft, eyebrow: v })} required />
                  <Input label="Huvudrubrik" value={draft.heading} onChange={v => setDraft({ ...draft, heading: v })} multiline required />
                  <Input label="Undertext" value={draft.subtext} onChange={v => setDraft({ ...draft, subtext: v })} multiline required />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Input label="Knapp 1 — text" value={draft.button1_label} onChange={v => setDraft({ ...draft, button1_label: v })} required />
                    <Input label="Knapp 1 — länk" value={draft.button1_href} onChange={v => setDraft({ ...draft, button1_href: v })} required />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Input label="Knapp 2 — text" value={draft.button2_label} onChange={v => setDraft({ ...draft, button2_label: v })} required />
                    <Input label="Knapp 2 — länk" value={draft.button2_href} onChange={v => setDraft({ ...draft, button2_href: v })} required />
                  </div>
                </>
              )}

              {/* ── FEATURE 1 & 2 ── */}
              {(editing === "feature1" || editing === "feature2") && (
                <>
                  <Input label="Liten text ovan rubrik (röd)" value={draft.eyebrow} onChange={v => setDraft({ ...draft, eyebrow: v })} required />
                  <Input label="Rubrik" value={draft.heading} onChange={v => setDraft({ ...draft, heading: v })} multiline required />
                  <Input label="Brödtext" value={draft.body} onChange={v => setDraft({ ...draft, body: v })} multiline required />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Input label="Knapp — text" value={draft.button_label} onChange={v => setDraft({ ...draft, button_label: v })} required />
                    <Input label="Knapp — länk" value={draft.button_href} onChange={v => setDraft({ ...draft, button_href: v })} required />
                  </div>
                  <Input label="Bildsökväg (t.ex. /Images/minbild.jpg)" value={draft.image} onChange={v => setDraft({ ...draft, image: v })} />
                  {draft.image && (
                    <img src={draft.image} alt="" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8, marginTop: -8, marginBottom: 16 }} />
                  )}
                </>
              )}

              {/* ── WHY ── */}
              {editing === "why" && draft.cards.map((card: any, i: number) => (
                <div key={i} style={{ background: "#0f0f0f", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <p style={{ color: "#555", fontSize: 11, marginBottom: 12 }}>Kort {i + 1}</p>
                  <Input label="Titel" value={card.title} onChange={v => {
                    const cards = [...draft.cards];
                    cards[i] = { ...cards[i], title: v };
                    setDraft({ ...draft, cards });
                  }} required />
                  <Input label="Beskrivning" value={card.desc} onChange={v => {
                    const cards = [...draft.cards];
                    cards[i] = { ...cards[i], desc: v };
                    setDraft({ ...draft, cards });
                  }} multiline required />
                </div>
              ))}

              {/* Status message */}
              {status && (
                <p style={{ color: status.type === "success" ? "#4ade80" : "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                  {status.msg}
                </p>
              )}

              {/* Save button */}
              <button onClick={handleSave} disabled={saving}
                style={{ width: "100%", background: saving ? "#333" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Save size={16} />
                {saving ? "Sparar..." : "Spara ändringar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
