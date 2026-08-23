function Bar({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, background: "#1f1f1f", borderRadius: 6 }} />;
}

export default function CustomersLoading() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Bar w={120} h={26} />
          <Bar w={100} h={13} />
        </div>
        <Bar w={120} h={38} />
      </div>
      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "14px 16px", borderBottom: "1px solid #1a1a1a", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="skeleton" style={{ width: 34, height: 34, borderRadius: "50%", background: "#1f1f1f" }} />
              <Bar w={100} h={13} />
            </div>
            <Bar w="20%" h={13} />
            <Bar w="12%" h={13} />
            <Bar w="12%" h={13} />
            <Bar w={80} h={13} />
          </div>
        ))}
      </div>
    </div>
  );
}
