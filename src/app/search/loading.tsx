function Bar({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, background: "#e5e7eb", borderRadius: 6 }} />;
}

export default function SearchLoading() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Bar w={220} h={28} />
        <div style={{ height: 24 }} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="skeleton" style={{ height: 160, background: "#e5e7eb" }} />
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <Bar w="60%" h={11} />
                <Bar w="90%" h={13} />
                <Bar w="50%" h={13} />
                <Bar w="100%" h={30} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
