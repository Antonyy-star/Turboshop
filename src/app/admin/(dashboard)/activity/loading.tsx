function Bar({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, background: "#1f1f1f", borderRadius: 6 }} />;
}

export default function ActivityLoading() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Bar w={180} h={26} />
        <div style={{ height: 8 }} />
        <Bar w={140} h={13} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        {[1, 2].map(i => (
          <div key={i} className="skeleton" style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1f1f1f" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Bar w={80} h={13} />
              <Bar w={60} h={11} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "14px 18px", borderBottom: "1px solid #1a1a1a", alignItems: "center" }}>
            <Bar w={32} h={32} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <Bar w="50%" h={13} />
              <Bar w="30%" h={11} />
            </div>
            <Bar w={80} h={13} />
          </div>
        ))}
      </div>
    </div>
  );
}
