import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

const categoryNames: Record<string, string> = {
  turboladdare: "Turboladdare",
  chra: "Patroner (CHRA)",
  turbodelar: "Turbodelar",
  kompressorhjul: "Kompressorhjul",
  packningar: "Packningar & tätningar",
  prestanda: "Prestandadelar",
  utrustning: "Reparationsutrustning",
};

// Maps URL slug → DB category value
const slugToDbCategory: Record<string, string> = {
  turboladdare: "Turboladdare",
  chra: "CHRA",
  turbodelar: "Turbodelar",
  kompressorhjul: "Kompressorhjul",
  packningar: "Packningar & Tätningar",
  reparationskit: "Reparationskit",
  utrustning: "Utrustning",
};

const filterBrands = ["Garrett", "BorgWarner", "Holset", "Mitsubishi", "IHI", "BMTS", "Continental", "Hitachi", "Valeo", "Toyota", "Master", "CZ Turbo"];

const PRODUCTS_PER_PAGE = 40;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sida?: string }>;
}) {
  const { slug } = await params;
  const { sida } = await searchParams;

  const categoryName = categoryNames[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  const dbCategory = slugToDbCategory[slug];

  const supabase = createServiceClient();

  // Get total count for this category
  let countQuery = supabase.from("products").select("*", { count: "exact", head: true });
  if (dbCategory) {
    if (slug === "turboladdare") {
      countQuery = (countQuery as any).or(`category.eq.${dbCategory},category.is.null`);
    } else {
      countQuery = (countQuery as any).eq("category", dbCategory);
    }
  }
  const { count: totalCount } = await countQuery;
  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const currentPage = Math.max(1, Math.min(parseInt(sida ?? "1", 10), totalPages));
  const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;

  // Fetch current page
  let dataQuery = supabase
    .from("products")
    .select("id,name,brand,sku,price,original_price,images,badge,in_stock,category");
  if (dbCategory) {
    if (slug === "turboladdare") {
      dataQuery = (dataQuery as any).or(`category.eq.${dbCategory},category.is.null`);
    } else {
      dataQuery = (dataQuery as any).eq("category", dbCategory);
    }
  }
  const { data: dbProducts } = await dataQuery
    .order("price", { ascending: false })
    .range(from, to);

  const products = (dbProducts ?? []).map((p: any) => ({
    id: String(p.id),
    name: p.name,
    brand: p.brand,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    sku: p.sku ?? "",
    badge: p.badge ?? null,
    images: p.images ?? [],
    in_stock: p.in_stock !== false,
  }));

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pageNumbers.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2
  );

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-red-600 transition">Hem</Link>
            <span>›</span>
            <span className="text-black font-medium">{categoryName}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-sm text-black mb-3 uppercase tracking-wide">Varumärke</h3>
              <ul className="space-y-2">
                {filterBrands.map((brand) => (
                  <li key={brand} className="flex items-center gap-2">
                    <input type="checkbox" id={brand} className="accent-red-600" />
                    <label htmlFor={brand} className="text-sm text-gray-700 cursor-pointer hover:text-red-600 transition">{brand}</label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-sm text-black mb-3 uppercase tracking-wide">Pris (kr)</h3>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="Min" className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-red-500" />
                <span className="text-gray-400 text-sm">–</span>
                <input type="number" placeholder="Max" className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-red-500" />
              </div>
              <button className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 rounded transition">Tillämpa</button>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-sm text-black mb-3 uppercase tracking-wide">Tillgänglighet</h3>
              <ul className="space-y-2">
                {["I lager", "På beställning", "Rea"].map((opt) => (
                  <li key={opt} className="flex items-center gap-2">
                    <input type="checkbox" id={opt} className="accent-red-600" />
                    <label htmlFor={opt} className="text-sm text-gray-700 cursor-pointer hover:text-red-600 transition">{opt}</label>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                Visar {from + 1}–{Math.min(from + PRODUCTS_PER_PAGE, total)} av <strong>{total.toLocaleString("sv-SE")}</strong> produkter
              </p>
              <select className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 bg-white">
                <option>Sortera: Standard</option>
                <option>Pris: Lägst först</option>
                <option>Pris: Högst först</option>
                <option>Nyast</option>
              </select>
            </div>

            {products.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                <p className="text-gray-400 text-lg mb-2">Inga produkter hittades i denna kategori</p>
                <Link href="/" className="text-red-600 text-sm hover:underline">Tillbaka till startsidan</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/produkt/${product.id}`}
                    className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-red-300 transition"
                  >
                    <div className="bg-gray-100 h-40 flex items-center justify-center relative">
                      {product.images[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-400 text-xl">⚙</span>
                        </div>
                      )}
                      {product.badge && (
                        <span className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded ${product.badge === "Rea" ? "bg-red-600" : "bg-green-600"}`}>
                          {product.badge}
                        </span>
                      )}
                      {product.in_stock ? (
                        <span className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">I lager</span>
                      ) : (
                        <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Slut</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-400 mb-1">{product.brand} · {product.sku}</p>
                      <h3 className="font-semibold text-sm text-black group-hover:text-red-600 transition leading-tight mb-2 line-clamp-2">{product.name}</h3>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-base font-bold text-black">{product.price.toLocaleString("sv-SE")} kr</span>
                        {product.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">{product.originalPrice.toLocaleString("sv-SE")} kr</span>
                        )}
                      </div>
                      <button className="w-full bg-black hover:bg-red-600 text-white text-xs font-medium py-2 rounded transition">Lägg i varukorg</button>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-10">
                {currentPage > 1 && (
                  <Link href={`/kategori/${slug}?sida=${currentPage - 1}`} className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition">‹ Föregående</Link>
                )}
                {visiblePages.map((p, idx) => {
                  const prev = visiblePages[idx - 1];
                  return (
                    <span key={p} className="flex items-center gap-1">
                      {prev && p - prev > 1 && <span className="px-2 text-gray-400">…</span>}
                      <Link href={`/kategori/${slug}?sida=${p}`}
                        className={`px-3 py-2 text-sm border rounded transition ${p === currentPage ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-300 hover:border-red-500 hover:text-red-600"}`}>
                        {p}
                      </Link>
                    </span>
                  );
                })}
                {currentPage < totalPages && (
                  <Link href={`/kategori/${slug}?sida=${currentPage + 1}`} className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition">Nästa ›</Link>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <p className="text-center text-xs text-gray-400 mt-3">Sida {currentPage} av {totalPages}</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
