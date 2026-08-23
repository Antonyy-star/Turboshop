function Bar({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, background: "#1f1f1f", borderRadius: 6 }} />;
}

export default function ProductsLoading() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Bar w={160} h={26} />
          <Bar w={120} h={13} />
        </div>
        <Bar w={110} h={38} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Bar w="100%" h={38} />
        <Bar w={200} h={38} />
      </div>
      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1f1f1f", display: "flex", gap: 16 }}>
          {[200, 100, 100, 80, 70, 40].map((w, i) => <Bar key={i} w={w} h={12} />)}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "14px 16px", borderBottom: "1px solid #1a1a1a", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4 }}>
              <Bar w={36} h={36} />
            </div>
            <Bar w="35%" h={13} />
            <Bar w="12%" h={13} />
            <Bar w="12%" h={13} />
            <Bar w="10%" h={13} />
            <Bar w={60} h={28} />
          </div>
        ))}
      </div>
    </div>
  );
}
