function Bar({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, background: "#1f1f1f", borderRadius: 6 }} />;
}

export default function OrdersLoading() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Bar w={160} h={26} />
        <div style={{ height: 8 }} />
        <Bar w={120} h={13} />
      </div>
      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "16px 18px", borderBottom: "1px solid #1a1a1a", alignItems: "center" }}>
            <Bar w="25%" h={13} />
            <Bar w="20%" h={13} />
            <Bar w="15%" h={13} />
            <Bar w={70} h={26} />
          </div>
        ))}
      </div>
    </div>
  );
}
