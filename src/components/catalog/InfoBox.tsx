// Dark header info box — matches turbocentras.com card style
export function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", border: "1px solid #d1d5db", background: "#fff", minWidth: 0 }}>
      <div style={{
        background: "#4a4a4a",
        color: "#fff",
        padding: "7px 12px",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        lineHeight: 1.3,
        flexShrink: 0,
      }}>
        {title}
      </div>
      <div style={{ padding: "10px 12px", fontSize: 13, color: "#222", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 4, fontSize: 13 }}>
      <span style={{ color: "#666", flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: 500, color: "#111" }}>{value}</span>
    </div>
  );
}
