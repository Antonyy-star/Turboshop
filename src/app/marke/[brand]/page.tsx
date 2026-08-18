import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import ProductImage from "@/components/ProductImage";

const brandMeta: Record<string, { displayName: string; logo: string; desc: string }> = {
  garrett: {
    displayName: "Garrett",
    logo: "/brands/kisspng-turbocharger-garrett-airesearch-business-engine-in-garrett-5b3dfc697c5e14.6655578415307889695094.jpg",
    desc: "Garrett Motion är världsledande inom turboladdarteknik. Från gaturacern till tävlingsbanan — vi har rätt Garrett-turbo för dig.",
  },
  borgwarner: {
    displayName: "BorgWarner",
    logo: "/brands/BorgWarner.png.webp",
    desc: "BorgWarner EFR-serien sätter standarden för moderna prestandaturbos med inbyggd wastegate och billet-kompressorhjul.",
  },
  mitsubishi: {
    displayName: "Mitsubishi",
    logo: "/brands/Mitsubishi_logo.svg",
    desc: "Mitsubishi Heavy Industries turbos används av OEM-tillverkare världen över och är kända för pålitlighet och precision.",
  },
  holset: {
    displayName: "Holset",
    logo: "/brands/hol10652_10.jpg",
    desc: "Holset är Cummins turbovarumärke och levererar robusta turbos för tunga fordon och dieselmotorer.",
  },
  ihi: {
    displayName: "IHI",
    logo: "/brands/IHI_square.png.avif",
    desc: "IHI turboladdare är standard på många japanska sportbilar inklusive Subaru Impreza WRX och STI.",
  },
  bmts: {
    displayName: "BMTS",
    logo: "/brands/BMTS.jpeg",
    desc: "BMTS Technology är ett joint venture mellan Bosch och Mahle som tillverkar moderna twinscroll-turbos för personbilar.",
  },
  hitachi: {
    displayName: "Hitachi",
    logo: "/brands/Hitachi-Logo.png",
    desc: "Hitachi turboladdare används primärt i japanska och koreanska personbilar och är kända för kompakt design.",
  },
  valeo: {
    displayName: "Valeo",
    logo: "/brands/Valeo_Logo.svg.png",
    desc: "Valeo är en ledande OEM-leverantör av turbosystem för europeiska fordon.",
  },
  continental: {
    displayName: "Continental",
    logo: "/brands/continental-logo-png_seeklogo-270061.png",
    desc: "Continental producerar avancerade turbosystem och VNT-turbos för moderna dieselmotorer.",
  },
  toyota: {
    displayName: "Toyota",
    logo: "/brands/kisspng-toyota-corolla-car-toyota-motor-sales-u-s-a-inc-1713918574954.webp",
    desc: "Originalturbos och eftermarknadsturbos kompatibla med Toyota-motorer inklusive 1JZ och 2JZ.",
  },
  "cz-turbo": {
    displayName: "CZ Turbo",
    logo: "/brands/Logo_CZ.jpg",
    desc: "CZ Turbo erbjuder kvalitativa remanufactured turbos och CHRA-patroner till konkurrenskraftiga priser.",
  },
  master: {
    displayName: "Master",
    logo: "/brands/master2.png",
    desc: "Master turbokomponenter levererar pålitliga OEM-specifikationsdelar för brett tillämpningsområde.",
  },
  "ee turbo": {
    displayName: "EE Turbo",
    logo: "",
    desc: "EE Turbo erbjuder ett brett sortiment av turboladdare och turbokomponenter.",
  },
  turbocentras: {
    displayName: "TurboCentras",
    logo: "",
    desc: "TurboCentras erbjuder ett komplett sortiment av turbodelar och kompletta turboenheter.",
  },
};

const PRODUCTS_PER_PAGE = 40;

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ sida?: string }>;
}) {
  const { brand } = await params;
  const { sida } = await searchParams;

  const currentPage = Math.max(1, parseInt(sida ?? "1", 10));

  // Resolve display name from slug
  const metaKey = brand.toLowerCase().replace(/-/g, " ");
  const metaBySpace = brandMeta[metaKey];
  const metaDirect = brandMeta[brand];
  const meta = metaDirect ?? metaBySpace ?? {
    displayName: brand.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    logo: "",
    desc: "",
  };

  const supabase = createServiceClient();

  // Run count + first-page data in parallel; re-fetch data if page != 1
  const from0 = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const to0 = from0 + PRODUCTS_PER_PAGE - 1;

  const [{ count: totalCount }, { data: dbProducts }] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .ilike("brand", meta.displayName),
    supabase
      .from("products")
      .select("id,name,brand,sku,price,original_price,images,badge,in_stock,category")
      .ilike("brand", meta.displayName)
      .order("price", { ascending: false })
      .range(from0, to0),
  ]);

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const from = (safePage - 1) * PRODUCTS_PER_PAGE;

  const products = (dbProducts ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    sku: p.sku ?? "",
    badge: p.badge ?? null,
    image: p.images?.[0] ?? null,
    in_stock: p.in_stock !== false,
  }));

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pageNumbers.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2
  );

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-red-600 transition">Hem</Link>
            <span>›</span>
            <Link href="/kategori/turboladdare" className="hover:text-red-600 transition">Turboladdare</Link>
            <span>›</span>
            <span className="text-black font-medium">{meta.displayName}</span>
          </div>
        </div>

        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6 flex items-center gap-6">
            {meta.logo && (
              <div className="flex-shrink-0 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-center" style={{ width: 140, height: 80 }}>
                <img src={meta.logo} alt={meta.displayName} className="object-contain" style={{ maxWidth: 110, maxHeight: 55 }} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-black mb-1">{meta.displayName} Turboladdare</h1>
              {meta.desc && <p className="text-sm text-gray-500 max-w-xl">{meta.desc}</p>}
              <p className="text-xs text-gray-400 mt-2">{total.toLocaleString("sv-SE")} produkter tillgängliga</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-500">
              Visar {from + 1}–{Math.min(from + PRODUCTS_PER_PAGE, total)} av <strong>{total.toLocaleString("sv-SE")}</strong> produkter
            </p>
          </div>

          {products.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
              <p className="text-gray-400 text-lg mb-2">Inga produkter hittades</p>
              <Link href="/kategori/turboladdare" className="text-red-600 text-sm hover:underline">Bläddra alla kategorier</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((product) => (
                <Link
                  key={String(product.id)}
                  href={`/produkt/${product.id}`}
                  className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-red-300 transition"
                >
                  <div className="bg-gray-100 h-40 flex items-center justify-center relative overflow-hidden">
                    <ProductImage src={product.image} alt={product.name} />
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-10">
              {safePage > 1 && (
                <Link href={`/marke/${brand}?sida=${safePage - 1}`} className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition">‹ Föregående</Link>
              )}
              {visiblePages.map((p, idx) => {
                const prev = visiblePages[idx - 1];
                return (
                  <span key={p} className="flex items-center gap-1">
                    {prev && p - prev > 1 && <span className="px-2 text-gray-400">…</span>}
                    <Link href={`/marke/${brand}?sida=${p}`}
                      className={`px-3 py-2 text-sm border rounded transition ${p === safePage ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-300 hover:border-red-500 hover:text-red-600"}`}>
                      {p}
                    </Link>
                  </span>
                );
              })}
              {safePage < totalPages && (
                <Link href={`/marke/${brand}?sida=${safePage + 1}`} className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition">Nästa ›</Link>
              )}
            </div>
          )}
          {totalPages > 1 && (
            <p className="text-center text-xs text-gray-400 mt-3">Sida {safePage} av {totalPages}</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
