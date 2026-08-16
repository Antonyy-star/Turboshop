import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { generateProducts } from "@/lib/products";
import { getAllRealProducts, type ParsedProduct } from "@/lib/parseProducts";
import { createClient } from "@/lib/supabase/server";

const categoryNames: Record<string, string> = {
  turboladdare: "Turboladdare",
  chra: "Patroner (CHRA)",
  kompressorhjul: "Kompressorhjul",
  packningar: "Packningar & tätningar",
  prestanda: "Prestandadelar",
  utrustning: "Reparationsutrustning",
};

// Maps URL slug → DB category value
const slugToDbCategory: Record<string, string> = {
  turboladdare: "Turboladdare",
  turbodelar: "Turbodelar",
  kompressorhjul: "Kompressorhjul",
  packningar: "Packningar & Tätningar",
  reparationskit: "Reparationskit",
  utrustning: "Utrustning",
};

const filterBrands = ["Garrett", "BorgWarner", "Holset", "Mitsubishi", "IHI", "BMTS", "Continental", "Hitachi", "Valeo", "Toyota", "Master", "CZ Turbo"];

const PRODUCTS_PER_PAGE = 40;

type DisplayProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  sku: string;
  badge: string | null;
  images: string[];
  real: boolean;
};

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

  // Fetch DB products for this category
  const supabase = await createClient();
  const dbCategory = slugToDbCategory[slug];
  const { data: dbProducts } = dbCategory
    ? await supabase.from("products").select("*").eq("category", dbCategory).order("created_at", { ascending: false })
    : { data: [] as any[] };

  // Use DB products if available, else fall back to parseProducts (turboladdare only)
  const realProductsList: DisplayProduct[] = (dbProducts && dbProducts.length > 0)
    ? dbProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : null,
        sku: p.sku ?? "",
        badge: p.badge ?? null,
        images: p.images ?? [],
        real: true,
      }))
    : (slug === "turboladdare"
        ? getAllRealProducts().map((p: ParsedProduct) => ({ ...p, real: true }))
        : []);

  const generated = generateProducts(1480).map((p) => ({
    ...p,
    id: String(p.id),
    images: [] as string[],
    real: false,
  }));

  // Real/DB products first, generated fill the rest (no duplicate SKUs)
  const realSkus = new Set(realProductsList.map((p) => p.sku));
  const filtered = generated.filter((p) => !realSkus.has(p.sku));
  const ALL_PRODUCTS: DisplayProduct[] = [...realProductsList, ...filtered];

  const currentPage = Math.max(1, parseInt(sida ?? "1", 10));
  const totalPages = Math.ceil(ALL_PRODUCTS.length / PRODUCTS_PER_PAGE);
  const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const products = ALL_PRODUCTS.slice(start, start + PRODUCTS_PER_PAGE);

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
                Visar {start + 1}–{Math.min(start + PRODUCTS_PER_PAGE, ALL_PRODUCTS.length)} av <strong>{ALL_PRODUCTS.length}</strong> produkter
                {realProductsList.length > 0 && (
                  <span className="ml-2 text-green-600 font-medium">· {realProductsList.length} i lager</span>
                )}
              </p>
              <select className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 bg-white">
                <option>Sortera: Standard</option>
                <option>Pris: Lägst först</option>
                <option>Pris: Högst först</option>
                <option>Nyast</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={product.real ? `/produkt/${product.id}` : "#"}
                  className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-red-300 transition"
                >
                  <div className="bg-gray-100 h-40 flex items-center justify-center relative">
                    {product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-5xl">⚙️</span>
                    )}
                    {product.badge && (
                      <span className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded ${product.badge === "Rea" ? "bg-red-600" : "bg-green-600"}`}>
                        {product.badge}
                      </span>
                    )}
                    {product.real && (
                      <span className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">I lager</span>
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

            {/* Pagination */}
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
            <p className="text-center text-xs text-gray-400 mt-3">Sida {currentPage} av {totalPages}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
