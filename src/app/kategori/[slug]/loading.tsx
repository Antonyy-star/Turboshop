function Bar({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, background: "#e5e7eb", borderRadius: 6 }} />;
}

export default function KategoriLoading() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Bar w={200} h={13} />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar skeleton */}
        <aside className="hidden md:block w-56 flex-shrink-0 space-y-4">
          {[120, 180, 100].map((h, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <Bar w={80} h={12} />
              <div style={{ height: 12 }} />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} style={{ marginBottom: 8 }}><Bar w="80%" h={12} /></div>
              ))}
            </div>
          ))}
        </aside>
        {/* Grid skeleton */}
        <div className="flex-1">
          <div className="flex justify-between mb-5">
            <Bar w={160} h={13} />
            <Bar w={140} h={32} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 16 }).map((_, i) => (
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
    </div>
  );
}
