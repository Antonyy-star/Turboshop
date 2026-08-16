import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

const katalogSections = [
  {
    title: "Kompletta turboladdare",
    desc: "OEM och eftermarknads turbos för personbilar, lastbilar och industri.",
    href: "/kategori/turboladdare",
    icon: "⚙️",
    count: "1 480 produkter",
  },
  {
    title: "Turbodelar",
    desc: "Kompressorhjul, turbinhjul, lagerhus, packningar och aktuatorer.",
    href: "/kategori/turbodelar",
    icon: "🔩",
    count: "320 produkter",
  },
  {
    title: "Prestandadelar",
    desc: "Intercoolers, BOV, wastegates, grenrör och downpipes.",
    href: "/kategori/prestanda",
    icon: "🏎️",
    count: "214 produkter",
  },
  {
    title: "Reparationsutrustning",
    desc: "Balanseringsmaskiner, rengöringsverktyg och testutrustning.",
    href: "/kategori/utrustning",
    icon: "🛠️",
    count: "88 produkter",
  },
  {
    title: "Packningar & tätningar",
    desc: "Kompletta packningssatser för alla turbomodeller.",
    href: "/kategori/packningar",
    icon: "🛡️",
    count: "156 produkter",
  },
  {
    title: "Kompressorhjul",
    desc: "Billet och OEM-ersättningshjul i alla storlekar.",
    href: "/kategori/kompressorhjul",
    icon: "🌀",
    count: "92 produkter",
  },
];

const brands = [
  { name: "Garrett", href: "/marke/garrett" },
  { name: "BorgWarner", href: "/marke/borgwarner" },
  { name: "Mitsubishi", href: "/marke/mitsubishi" },
  { name: "Holset", href: "/marke/holset" },
  { name: "IHI", href: "/marke/ihi" },
  { name: "Toyota", href: "/marke/toyota" },
  { name: "BMTS", href: "/marke/bmts" },
  { name: "Hitachi", href: "/marke/hitachi" },
  { name: "Valeo", href: "/marke/valeo" },
  { name: "Continental", href: "/marke/continental" },
  { name: "CZ Turbo", href: "/marke/cz-turbo" },
  { name: "Master", href: "/marke/master" },
];

export default function KatalogPage() {
  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        {/* Banner */}
        <div className="bg-gray-900 text-white py-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">Avancerat</span>
            </div>
            <h1 className="text-3xl font-black mb-2">Produktkatalog</h1>
            <p className="text-gray-400 text-sm max-w-xl">Bläddra igenom hela vårt sortiment av turbos, delar och utrustning. Filtrera efter kategori eller varumärke.</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Categories */}
          <h2 className="text-xl font-bold text-gray-900 mb-5">Kategorier</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {katalogSections.map((section) => (
              <Link
                key={section.title}
                href={section.href}
                className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-red-500 hover:shadow-md transition"
              >
                <div className="text-3xl mb-3">{section.icon}</div>
                <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition mb-1">{section.title}</h3>
                <p className="text-sm text-gray-500 mb-3">{section.desc}</p>
                <span className="text-xs font-semibold text-red-600">{section.count}</span>
              </Link>
            ))}
          </div>

          {/* Brands */}
          <h2 className="text-xl font-bold text-gray-900 mb-5">Varumärken</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {brands.map((brand) => (
              <Link
                key={brand.name}
                href={brand.href}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 text-center hover:border-red-400 hover:text-red-600 transition"
              >
                {brand.name}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
