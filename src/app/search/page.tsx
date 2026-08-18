import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 40;

function escapeIlike(s: string) {
  return s.replace(/[%_\\]/g, "\\$&");
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sida?: string }>;
}) {
  const { q, sida } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  const currentPage = Math.max(1, parseInt(sida ?? "1", 10));

  const supabase = await createClient();

  let results: any[] = [];
  let totalCount = 0;
  let totalPages = 1;

  if (query) {
    const esc = escapeIlike(query);
    const orFilter = `name.ilike.%${esc}%,sku.ilike.%${esc}%,brand.ilike.%${esc}%`;
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [{ count }, { data }] = await Promise.all([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .or(orFilter),
      supabase
        .from("products")
        .select("id,name,brand,sku,price,images,category,badge,in_stock")
        .or(orFilter)
        .order("price", { ascending: false })
        .range(from, to),
    ]);

    totalCount = count ?? 0;
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    results = data ?? [];
  }

  const from = (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, totalCount);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pageNumbers.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2
  );

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-red-600 transition">Hem</Link>
            <span>›</span>
            <span className="text-black font-medium">Sökresultat</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-xl font-bold text-black mb-1">
            {query ? `Sökresultat för "${query}"` : "Sök produkter"}
          </h1>

          {query && (
            <p className="text-sm text-gray-500 mb-6">
              {totalCount === 0
                ? "Inga produkter hittades"
                : `${totalCount.toLocaleString("sv-SE")} ${totalCount === 1 ? "produkt" : "produkter"} hittades · Visar ${from}–${to}`}
            </p>
          )}

          {!query && (
            <p className="text-gray-500 mt-8 text-center">Ange ett sökord i sökfältet ovan.</p>
          )}

          {query && totalCount === 0 && (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-lg font-semibold text-gray-700 mb-2">Inga produkter hittades för "{query}"</p>
              <p className="text-sm text-gray-500 mb-6">Prova ett annat artikelnummer, varumärke eller modell.</p>
              <Link href="/kategori/turboladdare" className="inline-block bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
                Visa alla produkter
              </Link>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-10">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/produkt/${p.id}`}
                    className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-red-300 transition"
                  >
                    <div className="bg-gray-100 h-40 flex items-center justify-center relative">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-400 text-lg">⚙</span>
                        </div>
                      )}
                      {p.badge && (
                        <span className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded ${p.badge === "Rea" ? "bg-red-600" : "bg-green-600"}`}>
                          {p.badge}
                        </span>
                      )}
                      {p.in_stock !== false ? (
                        <span className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">I lager</span>
                      ) : (
                        <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Slut</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-400 mb-1">{p.brand}{p.sku ? ` · ${p.sku}` : ""}</p>
                      <h3 className="font-semibold text-sm text-black group-hover:text-red-600 transition leading-tight mb-2 line-clamp-2">{p.name}</h3>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-base font-bold text-black">{Number(p.price).toLocaleString("sv-SE")} kr</span>
                      </div>
                      <button className="w-full bg-black hover:bg-red-600 text-white text-xs font-medium py-2 rounded transition">Lägg i varukorg</button>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  {currentPage > 1 && (
                    <Link href={`/search?q=${encodeURIComponent(query)}&sida=${currentPage - 1}`}
                      className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition">
                      ‹ Föregående
                    </Link>
                  )}
                  {visiblePages.map((p, idx) => {
                    const prev = visiblePages[idx - 1];
                    return (
                      <span key={p} className="flex items-center gap-1">
                        {prev && p - prev > 1 && <span className="px-2 text-gray-400">…</span>}
                        <Link
                          href={`/search?q=${encodeURIComponent(query)}&sida=${p}`}
                          className={`px-3 py-2 text-sm border rounded transition ${p === currentPage ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-300 hover:border-red-500 hover:text-red-600"}`}
                        >
                          {p}
                        </Link>
                      </span>
                    );
                  })}
                  {currentPage < totalPages && (
                    <Link href={`/search?q=${encodeURIComponent(query)}&sida=${currentPage + 1}`}
                      className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition">
                      Nästa ›
                    </Link>
                  )}
                </div>
              )}
              {totalPages > 1 && (
                <p className="text-center text-xs text-gray-400 mt-3">Sida {currentPage} av {totalPages}</p>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
