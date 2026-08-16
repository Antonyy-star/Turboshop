import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Wrench, Package, ShieldCheck } from "lucide-react";
import { realProducts } from "@/lib/realProducts";
import TurboViewerWrapper from "@/components/TurboViewerWrapper";

const categories = [
  { name: "Kompletta turboladdare", icon: "⚙️", desc: "OEM & eftermarknads turbos", href: "/kategori/turboladdare" },
  { name: "Kompressorhjul", icon: "🌀", desc: "Billet & OEM-ersättningar", href: "/kategori/kompressorhjul" },
  { name: "Packningar & tätningar", icon: "🛡️", desc: "Kompletta packningssatser", href: "/kategori/packningar" },
  { name: "Reparations Kit", icon: "🔧", desc: "Balansering & testverktyg", href: "/kategori/utrustning" },
];

const brands = [
  { name: "Garrett", logo: "/brands/kisspng-turbocharger-garrett-airesearch-business-engine-in-garrett-5b3dfc697c5e14.6655578415307889695094.jpg" },
  { name: "BorgWarner", logo: "/brands/BorgWarner.png.webp" },
  { name: "Mitsubishi", logo: "/brands/Mitsubishi_logo.svg" },
  { name: "Holset", logo: "/brands/hol10652_10.jpg" },
  { name: "IHI", logo: "/brands/IHI_square.png.avif" },
  { name: "Toyota", logo: "/brands/kisspng-toyota-corolla-car-toyota-motor-sales-u-s-a-inc-1713918574954.webp" },
  { name: "BMTS", logo: "/brands/BMTS.jpeg" },
  { name: "Hitachi", logo: "/brands/Hitachi-Logo.png" },
  { name: "Valeo", logo: "/brands/Valeo_Logo.svg.png" },
  { name: "Continental", logo: "/brands/continental-logo-png_seeklogo-270061.png" },
  { name: "CZ Turbo", logo: "/brands/Logo_CZ.jpg" },
  { name: "Master", logo: "/brands/master2.png" },
];

const featuredProducts = realProducts.slice(0, 8);

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative text-white py-10 md:py-16 overflow-hidden" style={{ backgroundColor: "#111827" }}>
          {/* background image fading into dark */}
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: "url('/Images/Turboteknik.png')",
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              opacity: 1,
              maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 75%)",
            }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black via-black/60 to-black" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <p className="text-red-400 font-semibold text-sm uppercase tracking-widest mb-3">Frakt över hela världen</p>
              <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4">
                Premium turbos &<br />bildelar
              </h1>
              <p className="text-gray-400 text-base md:text-lg mb-6 md:mb-8 max-w-md">
                OEM och eftermarknads turboladdare, patroner och delar för alla märken och modeller. Snabb leverans, expertsupport.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link href="/kategori/turboladdare" className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 md:px-6 md:py-3 rounded-md transition text-sm md:text-base">
                  Handla turbos
                </Link>
                <Link href="/kategori/delar" className="border border-gray-500 hover:border-white text-white font-semibold px-5 py-2.5 md:px-6 md:py-3 rounded-md transition text-sm md:text-base">
                  Visa alla delar
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Decorative accent strip */}
        <div className="lava-bar" style={{ height: 6 }} />

        {/* Kategorier */}
        <section className="bg-black py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6 text-white">Handla efter kategori</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className="feature-card block p-4 text-center no-underline"
                  style={{ textDecoration: "none", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <h3 className="font-semibold text-sm text-white leading-tight">{cat.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{cat.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Varumärken */}
        <section className="bg-gray-50 py-8 overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide text-center mb-6">Toppvarumärken</h2>
          <div className="relative">
            <div className="flex items-center animate-marquee" style={{ width: "max-content" }}>
              {[...brands, ...brands].map((brand, i) => (
                <Link
                  key={i}
                  href={`/marke/${brand.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="mx-4 flex-shrink-0 bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-center hover:border-red-400 hover:shadow-md transition group"
                  style={{ width: 140, height: 80 }}
                >
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-w-full max-h-full object-contain transition duration-300"
                    style={{ maxWidth: 110, maxHeight: 50 }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Utvalda produkter */}
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">Utvalda produkter</h2>
            <Link href="/produkter" className="text-red-600 hover:text-red-700 text-sm font-medium transition">
              Visa alla →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/produkt/${product.id}`}
                className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                <div className="bg-gray-100 h-44 flex items-center justify-center relative">
                  {product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-5xl">⚙️</span>
                  )}
                  {product.badge && (
                    <span className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded ${product.badge === "Rea" ? "bg-red-600" : "bg-green-600"}`}>
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
                  <h3 className="font-semibold text-sm text-black group-hover:text-red-600 transition leading-tight mb-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-black">{product.price.toLocaleString("sv-SE")} kr</span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">{product.originalPrice.toLocaleString("sv-SE")} kr</span>
                    )}
                  </div>
                  <button className="mt-3 w-full bg-black hover:bg-red-600 text-white text-sm font-medium py-2 rounded transition">
                    Lägg i varukorg
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Varför oss */}
        <section className="bg-black text-white py-12">
          <h2 className="text-2xl font-bold text-center mb-10 px-4">Varför välja TurboTeknik?</h2>
          <div className="relative overflow-hidden">
            {/* Left fade */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10"
              style={{ background: "linear-gradient(to right, #000 30%, transparent)" }} />
            {/* Right fade */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10"
              style={{ background: "linear-gradient(to left, #000 30%, transparent)" }} />

            <div className="feature-track">
              {[
                { Icon: Wrench,      title: "Expertkunskap",    desc: "Vårt team är turbospecialister med decennier av erfarenhet.",                         delay: "0s" },
                { Icon: Package,     title: "Snabb leverans",   desc: "Beställningar före kl. 14:00 skickas samma dag. Leverans världen över.",              delay: "1s" },
                { Icon: ShieldCheck, title: "Kvalitetsgaranti", desc: "Alla delar testade och verifierade. Full garanti på varje beställning.",              delay: "2s" },
                { Icon: Wrench,      title: "Expertkunskap",    desc: "Vårt team är turbospecialister med decennier av erfarenhet.",                         delay: "0s" },
                { Icon: Package,     title: "Snabb leverans",   desc: "Beställningar före kl. 14:00 skickas samma dag. Leverans världen över.",              delay: "1s" },
                { Icon: ShieldCheck, title: "Kvalitetsgaranti", desc: "Alla delar testade och verifierade. Full garanti på varje beställning.",              delay: "2s" },
              ].map((item, i) => (
                <div key={i} className="feature-card-wrap">
                  <div
                    className="feature-card p-4 md:p-7 text-center"
                    style={{ animationDelay: item.delay }}
                  >
                    <item.Icon size={28} className="mx-auto mb-3 md:mb-4 md:w-9 md:h-9" color="#DC2626" strokeWidth={1.8} />
                    <h3 className="font-bold text-sm md:text-lg mb-1 md:mb-2 text-white">{item.title}</h3>
                    <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
