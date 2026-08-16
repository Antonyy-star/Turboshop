import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { generateBrandProducts } from "@/lib/products";
import { getProductsByBrand, type RealProduct } from "@/lib/realProducts";

const brandMeta: Record<string, { displayName: string; count: number; logo: string; desc: string }> = {
  garrett: {
    displayName: "Garrett",
    count: 625,
    logo: "/brands/kisspng-turbocharger-garrett-airesearch-business-engine-in-garrett-5b3dfc697c5e14.6655578415307889695094.jpg",
    desc: "Garrett Motion är världsledande inom turboladdarteknik. Från gaturacern till tävlingsbanan — vi har rätt Garrett-turbo för dig.",
  },
  borgwarner: {
    displayName: "BorgWarner",
    count: 407,
    logo: "/brands/BorgWarner.png.webp",
    desc: "BorgWarner EFR-serien sätter standarden för moderna prestandaturbos med inbyggd wastegate och billet-kompressorhjul.",
  },
  mitsubishi: {
    displayName: "Mitsubishi",
    count: 139,
    logo: "/brands/Mitsubishi_logo.svg",
    desc: "Mitsubishi Heavy Industries turbos används av OEM-tillverkare världen över och är kända för pålitlighet och precision.",
  },
  holset: {
    displayName: "Holset",
    count: 49,
    logo: "/brands/hol10652_10.jpg",
    desc: "Holset är Cummins turbovarumärke och levererar robusta turbos för tunga fordon och dieselmotorer.",
  },
  ihi: {
    displayName: "IHI",
    count: 99,
    logo: "/brands/IHI_square.png.avif",
    desc: "IHI turboladdare är standard på många japanska sportbilar inklusive Subaru Impreza WRX och STI.",
  },
  bmts: {
    displayName: "BMTS",
    count: 102,
    logo: "/brands/BMTS.jpeg",
    desc: "BMTS Technology är ett joint venture mellan Bosch och Mahle som tillverkar moderna twinscroll-turbos för personbilar.",
  },
  hitachi: {
    displayName: "Hitachi",
    count: 1,
    logo: "/brands/Hitachi-Logo.png",
    desc: "Hitachi turboladdare används primärt i japanska och koreanska personbilar och är kända för kompakt design.",
  },
  valeo: {
    displayName: "Valeo",
    count: 3,
    logo: "/brands/Valeo_Logo.svg.png",
    desc: "Valeo är en ledande OEM-leverantör av turbosystem för europeiska fordon.",
  },
  continental: {
    displayName: "Continental",
    count: 20,
    logo: "/brands/continental-logo-png_seeklogo-270061.png",
    desc: "Continental producerar avancerade turbosystem och VNT-turbos för moderna dieselmotorer.",
  },
  toyota: {
    displayName: "Toyota",
    count: 6,
    logo: "/brands/kisspng-toyota-corolla-car-toyota-motor-sales-u-s-a-inc-1713918574954.webp",
    desc: "Originalturbos och eftermarknadsturbos kompatibla med Toyota-motorer inklusive 1JZ och 2JZ.",
  },
  "cz-turbo": {
    displayName: "CZ Turbo",
    count: 22,
    logo: "/brands/Logo_CZ.jpg",
    desc: "CZ Turbo erbjuder kvalitativa remanufactured turbos och CHRA-patroner till konkurrenskraftiga priser.",
  },
  master: {
    displayName: "Master",
    count: 52,
    logo: "/brands/master2.png",
    desc: "Master turbokomponenter levererar pålitliga OEM-specifikationsdelar för brett tillämpningsområde.",
  },
};

const PRODUCTS_PER_PAGE = 40;

const filterCategories = ["Kompletta turbos", "Patroner (CHRA)", "Kompressorhjul", "Reparationsdelar", "Aktuatorer"];

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ sida?: string }>;
}) {
  const { brand } = await params;
  const { sida } = await searchParams;

  const meta = brandMeta[brand] ?? {
    displayName: brand.charAt(0).toUpperCase() + brand.slice(1),
    count: 100,
    logo: "",
    desc: "",
  };

  const realProducts = getProductsByBrand(brand);
  const generatedProducts = generateBrandProducts(brand, Math.max(0, meta.count - realProducts.length));
  const allProducts = [...realProducts.map((p: RealProduct) => ({
    id: p.id as unknown as number,
    name: p.name,
    brand: p.brand,
    price: p.price,
    originalPrice: p.originalPrice,
    sku: p.sku,
    badge: p.badge,
    image: p.images[0],
    isReal: true,
  })), ...generatedProducts.map((p) => ({ ...p, image: null, isReal: false }))];
  const currentPage = Math.max(1, parseInt(sida ?? "1", 10));
  const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE);
  const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const products = allProducts.slice(start, start + PRODUCTS_PER_PAGE);

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
            <Link href="/kategori/turboladdare" className="hover:text-red-600 transition">Turboladdare</Link>
            <span>›</span>
            <span className="text-black font-medium">{meta.displayName}</span>
          </div>
        </div>

        {/* Brand banner */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6 flex items-center gap-6">
            {meta.logo && (
              <div className="flex-shrink-0 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-center" style={{ width: 140, height: 80 }}>
                <img src={meta.logo} alt={meta.displayName} className="object-contain" style={{ maxWidth: 110, maxHeight: 55 }} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-black mb-1">{meta.displayName} Turboladdare</h1>
              <p className="text-sm text-gray-500 max-w-xl">{meta.desc}</p>
              <p className="text-xs text-gray-400 mt-2">{meta.count} produkter tillgängliga</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-sm text-black mb-3 uppercase tracking-wide">Kategori</h3>
              <ul className="space-y-2">
                {filterCategories.map((cat) => (
                  <li key={cat} className="flex items-center gap-2">
                    <input type="checkbox" id={cat} className="accent-red-600" />
                    <label htmlFor={cat} className="text-sm text-gray-700 cursor-pointer hover:text-red-600 transition">{cat}</label>
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
              <button className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 rounded transition">
                Tillämpa
              </button>
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
                Visar {start + 1}–{Math.min(start + PRODUCTS_PER_PAGE, allProducts.length)} av <strong>{allProducts.length}</strong> produkter
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
                  href={`/produkt/${product.id}`}
                  className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-red-300 transition"
                >
                  <div className="bg-gray-100 h-40 flex items-center justify-center relative">
                    {"image" in product && product.image ? (
                      <img src={product.image as string} alt={product.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-5xl">⚙️</span>
                    )}
                    {product.badge && (
                      <span className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded ${product.badge === "Rea" ? "bg-red-600" : "bg-green-600"}`}>
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-1">{product.brand} · {product.sku}</p>
                    <h3 className="font-semibold text-sm text-black group-hover:text-red-600 transition leading-tight mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-base font-bold text-black">{product.price.toLocaleString("sv-SE")} kr</span>
                      {product.originalPrice && (
                        <span className="text-xs text-gray-400 line-through">{product.originalPrice.toLocaleString("sv-SE")} kr</span>
                      )}
                    </div>
                    <button className="w-full bg-black hover:bg-red-600 text-white text-xs font-medium py-2 rounded transition">
                      Lägg i varukorg
                    </button>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-1 mt-10">
              {currentPage > 1 && (
                <Link href={`/marke/${brand}?sida=${currentPage - 1}`} className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition">
                  ‹ Föregående
                </Link>
              )}
              {visiblePages.map((p, idx) => {
                const prev = visiblePages[idx - 1];
                return (
                  <span key={p} className="flex items-center gap-1">
                    {prev && p - prev > 1 && <span className="px-2 text-gray-400">…</span>}
                    <Link
                      href={`/marke/${brand}?sida=${p}`}
                      className={`px-3 py-2 text-sm border rounded transition ${p === currentPage ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-300 hover:border-red-500 hover:text-red-600"}`}
                    >
                      {p}
                    </Link>
                  </span>
                );
              })}
              {currentPage < totalPages && (
                <Link href={`/marke/${brand}?sida=${currentPage + 1}`} className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition">
                  Nästa ›
                </Link>
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
