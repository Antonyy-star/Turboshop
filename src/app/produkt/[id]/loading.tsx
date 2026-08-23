function Bar({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, background: "#e5e7eb", borderRadius: 6 }} />;
}

export default function ProduktLoading() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Bar w={240} h={13} />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton bg-white rounded-xl" style={{ height: 400, background: "#e5e7eb" }} />
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ width: 70, height: 70, borderRadius: 8, background: "#e5e7eb" }} />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Bar w="80%" h={28} />
            <Bar w="50%" h={18} />
            <Bar w="40%" h={32} />
            <div style={{ height: 16 }} />
            <Bar h={48} />
            <Bar h={48} />
            <div style={{ height: 16 }} />
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Bar key={i} w={`${70 - i * 8}%`} h={12} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
