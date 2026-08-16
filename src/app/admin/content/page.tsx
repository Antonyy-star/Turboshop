import { FileText } from "lucide-react";

export default function AdminContent() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Innehåll</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Redigera texter och bilder på hemsidan</p>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {[
          { title: "Hero-sektion", desc: "Rubrik, undertext och knappar i hjältebilden" },
          { title: "Bild + text sektion 1", desc: "Text bredvid första bilden" },
          { title: "Bild + text sektion 2", desc: "Text bredvid andra bilden" },
          { title: "Varför TurboTeknik", desc: "De tre kortsektionerna längst ned" },
        ].map(({ title, desc }) => (
          <div key={title} style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <FileText size={20} color="#555" />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{title}</p>
                <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{desc}</p>
              </div>
            </div>
            <button style={{ background: "#1f1f1f", color: "#ccc", border: "1px solid #2a2a2a", borderRadius: 6, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}>
              Redigera
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 24, marginTop: 24 }}>
        <p style={{ color: "#555", fontSize: 13, textAlign: "center" }}>Full innehållsredigering kräver en CMS-integration. Kontakta din utvecklare för att aktivera detta.</p>
      </div>
    </div>
  );
}
