import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);

  let results: any[] = [];

  if (query) {
    const { data } = await supabase
      .from("products")
      .select("id,name,brand,sku,price,images,category,badge,in_stock")
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(48);

    const lower = query.toLowerCase();
    const score = (p: any) => {
      const sku = (p.sku ?? "").toLowerCase();
      const name = p.name.toLowerCase();
      if (sku === lower) return 0;
      if (sku.startsWith(lower)) return 1;
      if (name === lower) return 2;
      if (name.startsWith(lower)) return 3;
      if (sku.includes(lower)) return 4;
      return 5;
    };
    results = (data ?? []).sort((a, b) => score(a) - score(b));
  }

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
              {results.length === 0
                ? "Inga produkter hittades"
                : `${results.length} ${results.length === 1 ? "produkt" : "produkter"} hittades`}
            </p>
          )}

          {!query && (
            <p className="text-gray-500 mt-8 text-center">Ange ett sökord i sökfältet ovan.</p>
          )}

          {query && results.length === 0 && (
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                      <span className="text-5xl">⚙️</span>
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
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
