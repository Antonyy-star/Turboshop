function Bar({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div className="skeleton" style={{ width: w, height: h, background: "#1f1f1f", borderRadius: 6 }} />
  );
}

export default function AdminLoading() {
  return (
    <div style={{ padding: "0 0 40px" }}>
      <Bar w={200} h={28} />
      <div style={{ height: 8 }} />
      <Bar w={140} h={14} />
      <div style={{ height: 32 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
            <Bar w={80} h={12} />
            <div style={{ height: 10 }} />
            <Bar w="60%" h={28} />
          </div>
        ))}
      </div>
      <div style={{ height: 28 }} />
      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "14px 18px", borderBottom: "1px solid #1a1a1a", alignItems: "center" }}>
            <Bar w={36} h={36} />
            <Bar w="40%" h={13} />
            <Bar w="15%" h={13} />
            <Bar w="10%" h={13} />
          </div>
        ))}
      </div>
    </div>
  );
}
