import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Wrench, Package, ShieldCheck, Zap, Wind } from "lucide-react";
import { realProducts } from "@/lib/realProducts";
import TurboViewerWrapper from "@/components/TurboViewerWrapper";

const categories = [
  { name: "Kompletta turboladdare", Icon: Zap,        desc: "OEM & eftermarknads turbos",   href: "/kategori/turboladdare" },
  { name: "Kompressorhjul",         Icon: Wind,       desc: "Billet & OEM-ersättningar",    href: "/kategori/kompressorhjul" },
  { name: "Packningar & tätningar", Icon: ShieldCheck, desc: "Kompletta packningssatser",   href: "/kategori/packningar" },
  { name: "Reparations Kit",        Icon: Wrench,     desc: "Balansering & testverktyg",    href: "/kategori/utrustning" },
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

        {/* Feature section 1 — text left, image right */}
        <section className="bg-black py-16">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1">
              <p className="text-red-500 text-sm font-semibold uppercase tracking-widest mb-3">Rubrik här</p>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
                Din text kommer<br />att synas här
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-6">
                Beskriv din produkt, tjänst eller fördel här. Berätta för kunden varför de ska välja er. Kort, tydligt och övertygande.
              </p>
              <Link href="/kategori/turboladdare" className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-md transition text-sm">
                Läs mer →
              </Link>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-2xl overflow-hidden" style={{ height: 320 }}>
                <img src="/Images/Bilden1.jpeg" alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Feature section 2 — image left, text right */}
        <section className="bg-black py-16" style={{ borderTop: "1px solid #111" }}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row-reverse items-center gap-10 md:gap-16">
            <div className="flex-1">
              <p className="text-red-500 text-sm font-semibold uppercase tracking-widest mb-3">Rubrik här</p>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
                Din text kommer<br />att synas här
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-6">
                Beskriv din produkt, tjänst eller fördel här. Berätta för kunden varför de ska välja er. Kort, tydligt och övertygande.
              </p>
              <Link href="/kategori/turboladdare" className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-md transition text-sm">
                Läs mer →
              </Link>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-2xl overflow-hidden" style={{ height: 320 }}>
                <img src="/Images/teknik1.jpeg" alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Varumärken */}
        <section className="bg-black py-8 overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide text-center mb-6">Toppvarumärken</h2>
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10"
              style={{ background: "linear-gradient(to right, #000 30%, transparent)" }} />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10"
              style={{ background: "linear-gradient(to left, #000 30%, transparent)" }} />
            <div className="flex items-center animate-marquee" style={{ width: "max-content" }}>
              {[...brands, ...brands].map((brand, i) => (
                <Link
                  key={i}
                  href={`/marke/${brand.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="feature-card mx-3 flex-shrink-0 flex items-center justify-center p-3"
                  style={{ width: 130, height: 76, textDecoration: "none" }}
                >
                  <div className="bg-white rounded-md flex items-center justify-center" style={{ width: 100, height: 50, padding: "5px 8px" }}>
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="max-w-full max-h-full object-contain"
                      style={{ maxWidth: 86, maxHeight: 38 }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>


        {/* Varför oss */}
        <section className="bg-black text-white py-12">
          <h2 className="text-2xl font-bold text-center mb-10 px-4">Varför välja TurboTeknik?</h2>
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
            {[
              { Icon: Wrench,      title: "Expertkunskap",    desc: "Vårt team är turbospecialister med decennier av erfarenhet." },
              { Icon: Package,     title: "Snabb leverans",   desc: "Beställningar före kl. 14:00 skickas samma dag. Leverans världen över." },
              { Icon: ShieldCheck, title: "Kvalitetsgaranti", desc: "Alla delar testade och verifierade. Full garanti på varje beställning." },
            ].map((item, i) => (
              <div key={i} className="feature-card flex-1 p-6 md:p-8 text-center">
                <item.Icon size={32} className="mx-auto mb-4" color="#DC2626" strokeWidth={1.8} />
                <h3 className="font-bold text-base md:text-lg mb-2 text-white">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
