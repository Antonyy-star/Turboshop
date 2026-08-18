import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

const spareParts = [
  { name: "Kompressorhjul", href: "/kategori/turbodelar" },
  { name: "Turbinhjul", href: "/kategori/turbodelar" },
  { name: "Lagerhus", href: "/kategori/turbodelar" },
  { name: "Reparationskit", href: "/kategori/turbodelar" },
  { name: "Packningar & tätningssatser", href: "/kategori/turbodelar" },
  { name: "Värmesköldar", href: "/kategori/turbodelar" },
  { name: "Munstycksringar (VNT)", href: "/kategori/turbodelar" },
  { name: "VNT munstycksburar", href: "/kategori/turbodelar" },
  { name: "Enhetsgasar", href: "/kategori/turbodelar" },
  { name: "Wastegate-ventiler", href: "/kategori/turbodelar" },
  { name: "Axel & Hjul", href: "/kategori/turbodelar" },
  { name: "Turbinhus", href: "/kategori/turbodelar" },
  { name: "Lager & Tryckskivor", href: "/kategori/turbodelar" },
  { name: "Oljeledningar & adaptrar", href: "/kategori/turbodelar" },
  { name: "Klämmor & band", href: "/kategori/turbodelar" },
  { name: "Aktuatorer", href: "/kategori/turbodelar" },
  { name: "Kolvringar", href: "/kategori/turbodelar" },
  { name: "Övriga delar", href: "/kategori/turbodelar" },
];

const allBrands = [
  { name: "Garrett", href: "/marke/garrett", logo: "/brands/kisspng-turbocharger-garrett-airesearch-business-engine-in-garrett-5b3dfc697c5e14.6655578415307889695094.jpg" },
  { name: "BorgWarner", href: "/marke/borgwarner", logo: "/brands/BorgWarner.png.webp" },
  { name: "Mitsubishi", href: "/marke/mitsubishi", logo: "/brands/Mitsubishi_logo.svg" },
  { name: "Holset", href: "/marke/holset", logo: "/brands/hol10652_10.jpg" },
  { name: "IHI", href: "/marke/ihi", logo: "/brands/IHI_square.png.avif" },
  { name: "Toyota", href: "/marke/toyota", logo: "/brands/kisspng-toyota-corolla-car-toyota-motor-sales-u-s-a-inc-1713918574954.webp" },
  { name: "BMTS", href: "/marke/bmts", logo: "/brands/BMTS.jpeg" },
  { name: "Hitachi", href: "/marke/hitachi", logo: "/brands/Hitachi-Logo.png" },
  { name: "Valeo", href: "/marke/valeo", logo: "/brands/Valeo_Logo.svg.png" },
  { name: "Continental", href: "/marke/continental", logo: "/brands/continental-logo-png_seeklogo-270061.png" },
  { name: "CZ Turbo", href: "/marke/cz-turbo", logo: "/brands/Logo_CZ.jpg" },
  { name: "Master Power", href: "/marke/master", logo: "/brands/master2.png" },
  { name: "EE Turbo", href: "/marke/ee-turbo", logo: "" },
  { name: "TurboCentras", href: "/marke/turbocentras", logo: "" },
  { name: "Bosch", href: "/marke/bosch", logo: "" },
  { name: "Mahle", href: "/marke/mahle", logo: "" },
  { name: "Hella", href: "/marke/hella", logo: "" },
  { name: "Pierburg", href: "/marke/pierburg", logo: "" },
  { name: "Marelli", href: "/marke/marelli", logo: "" },
  { name: "Sonceboz", href: "/marke/sonceboz", logo: "" },
];

const pdfCatalogs = [
  { name: "MP Turbo Agro 2020", brand: "Master Power", desc: "Turbos för lantbruksmaskiner", url: "https://turbocentras.com/en/catalog" },
  { name: "MP Turbo Racing 2019", brand: "Master Power", desc: "Prestanda- och racingturbo", url: "https://turbocentras.com/en/catalog" },
];

export default async function KatalogPage() {
  const supabase = createServiceClient();

  const [
    { count: countTurbo },
    { count: countChra },
    { count: countDelar },
    { count: countTotal },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).or("category.eq.Turboladdare,category.is.null"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("category", "CHRA"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("category", "Turbodelar"),
    supabase.from("products").select("*", { count: "exact", head: true }),
  ]);

  const fmt = (n: number | null) => (n ?? 0).toLocaleString("sv-SE");

  const mainCategories = [
    {
      title: "Turboladdare",
      desc: "Kompletta OEM och remanufactured turboladdare för personbilar, lastbilar och industri.",
      href: "/kategori/turboladdare",
      count: fmt(countTurbo),
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-red-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      title: "Patroner (CHRA)",
      desc: "Kompletterande patroner — kärnan i turbon. OEM och remanufactured utföranden.",
      href: "/kategori/chra",
      count: fmt(countChra),
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-red-600">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
        </svg>
      ),
    },
    {
      title: "Turbodelar",
      desc: "Kompressorhjul, turbinhjul, lagerhus, packningar, aktuatorer och mycket mer.",
      href: "/kategori/turbodelar",
      count: fmt(countDelar),
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-red-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">

        {/* Banner */}
        <div className="bg-black text-white py-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">Avancerat</span>
            </div>
            <h1 className="text-3xl font-black mb-2">Produktkatalog</h1>
            <p className="text-gray-400 text-sm max-w-xl">
              Bläddra igenom hela vårt sortiment — {fmt(countTotal)} produkter inom turboladdare, patroner och reservdelar.
              Filtrera efter kategori eller varumärke.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12 space-y-14">

          {/* Main categories */}
          <section>
            <h2 className="text-xl font-bold text-black mb-6">Produktkategorier</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {mainCategories.map((cat) => (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-red-500 hover:shadow-md transition"
                >
                  <div className="mb-4">{cat.svg}</div>
                  <h3 className="font-bold text-black group-hover:text-red-600 transition mb-1 text-lg">{cat.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{cat.desc}</p>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">{cat.count} produkter</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Turbodelar subcategories */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-black">Turbodelars sortiment</h2>
              <Link href="/kategori/turbodelar" className="text-sm text-red-600 hover:underline font-medium">Visa alla turbodelar →</Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 divide-x divide-y divide-gray-100">
                {spareParts.map((part) => (
                  <Link
                    key={part.name}
                    href={part.href}
                    className="px-4 py-4 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition font-medium flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {part.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* PDF Catalogs */}
          <section>
            <h2 className="text-xl font-bold text-black mb-5">PDF-kataloger</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pdfCatalogs.map((pdf) => (
                <a
                  key={pdf.name}
                  href={pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:border-red-400 hover:shadow-md transition"
                >
                  <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-black group-hover:text-red-600 transition text-sm">{pdf.name}</p>
                    <p className="text-xs text-gray-500">{pdf.brand} · {pdf.desc}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-gray-400 uppercase">PDF</span>
                </a>
              ))}
            </div>
          </section>

          {/* Brands */}
          <section>
            <h2 className="text-xl font-bold text-black mb-5">Varumärken</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allBrands.map((brand) => (
                <Link
                  key={brand.name}
                  href={brand.href}
                  className="group bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-red-400 hover:shadow-md transition min-h-[80px]"
                >
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.name} className="object-contain h-8 max-w-[90px]" />
                  ) : (
                    <span className="font-bold text-sm text-gray-700 group-hover:text-red-600 transition text-center">{brand.name}</span>
                  )}
                  {brand.logo && (
                    <span className="text-xs text-gray-400 group-hover:text-red-500 transition">{brand.name}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
