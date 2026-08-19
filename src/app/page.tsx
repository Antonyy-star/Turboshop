import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Wrench, Package, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const brands = [
  { name: "Garrett",     logo: "/brands/kisspng-turbocharger-garrett-airesearch-business-engine-in-garrett-5b3dfc697c5e14.6655578415307889695094.jpg" },
  { name: "BorgWarner",  logo: "/brands/BorgWarner.png.webp" },
  { name: "Mitsubishi",  logo: "/brands/Mitsubishi_logo.svg" },
  { name: "Holset",      logo: "/brands/hol10652_10.jpg" },
  { name: "IHI",         logo: "/brands/IHI_square.png.avif" },
  { name: "Toyota",      logo: "/brands/kisspng-toyota-corolla-car-toyota-motor-sales-u-s-a-inc-1713918574954.webp" },
  { name: "BMTS",        logo: "/brands/BMTS.jpeg" },
  { name: "Hitachi",     logo: "/brands/Hitachi-Logo.png" },
  { name: "Valeo",       logo: "/brands/Valeo_Logo.svg.png" },
  { name: "Continental", logo: "/brands/continental-logo-png_seeklogo-270061.png" },
  { name: "CZ Turbo",    logo: "/brands/Logo_CZ.jpg" },
  { name: "Master",      logo: "/brands/master2.png" },
];

const whyIcons = [Wrench, Package, ShieldCheck];

const defaults = {
  hero: {
    eyebrow: "Frakt över hela världen",
    heading: "Premium turbos &\nbildelar",
    subtext: "OEM och eftermarknads turboladdare, patroner och delar för alla märken och modeller. Snabb leverans, expertsupport.",
    button1_label: "Handla turbos", button1_href: "/kategori/turboladdare",
    button2_label: "Visa alla delar", button2_href: "/kategori/delar",
  },
  feature1: {
    eyebrow: "Rubrik här",
    heading: "Din text kommer\natt synas här",
    body: "Beskriv din produkt, tjänst eller fördel här. Berätta för kunden varför de ska välja er. Kort, tydligt och övertygande.",
    button_label: "Läs mer →", button_href: "/kategori/turboladdare",
    image: "/Images/Bilden1.jpeg",
  },
  feature2: {
    eyebrow: "Rubrik här",
    heading: "Din text kommer\natt synas här",
    body: "Beskriv din produkt, tjänst eller fördel här. Berätta för kunden varför de ska välja er. Kort, tydligt och övertygande.",
    button_label: "Läs mer →", button_href: "/kategori/turboladdare",
    image: "/Images/teknik1.jpeg",
  },
  why: {
    cards: [
      { title: "Expertkunskap",    desc: "Vårt team är turbospecialister med decennier av erfarenhet." },
      { title: "Snabb leverans",   desc: "Beställningar före kl. 14:00 skickas samma dag. Leverans världen över." },
      { title: "Kvalitetsgaranti", desc: "Alla delar testade och verifierade. Full garanti på varje beställning." },
    ],
  },
};

export default async function Home() {
  // Fetch live content from Supabase; fall back to defaults if not set yet
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key, content");
  const db: Record<string, any> = {};
  data?.forEach(row => { db[row.key] = row.content; });

  const hero     = { ...defaults.hero,     ...(db.hero     ?? {}) };
  const feature1 = { ...defaults.feature1, ...(db.feature1 ?? {}) };
  const feature2 = { ...defaults.feature2, ...(db.feature2 ?? {}) };
  const why      = db.why ?? defaults.why;

  return (
    <>
      <Header />
      <main>
        {/* ─── Hero ─────────────────────────────────────────────────────────── */}
        {/* Mobile: py-12 (48px). Desktop: md:py-16 (64px). Was py-[120px] on mobile. */}
        <section className="relative text-white py-12 md:py-16 overflow-hidden" style={{ backgroundColor: "#111827" }}>
          <div className="absolute inset-0 z-0" style={{
            backgroundImage: "url('/Images/Turboteknik.png')",
            backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat",
            opacity: 1,
            maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 75%)",
          }} />
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black via-black/60 to-black" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <p className="text-red-400 font-semibold text-xs md:text-sm uppercase tracking-widest mb-3 anim-fade-up" style={{ animationDelay: "0s" }}>{hero.eyebrow}</p>
              <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4 anim-fade-up" style={{ whiteSpace: "pre-line", animationDelay: "0.1s" }}>
                {hero.heading}
              </h1>
              <p className="text-gray-400 text-sm md:text-lg mb-6 md:mb-8 max-w-md anim-fade-up" style={{ animationDelay: "0.18s" }}>{hero.subtext}</p>
              <div className="flex gap-3 flex-wrap anim-fade-up" style={{ animationDelay: "0.25s" }}>
                <Link href={hero.button1_href} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 md:px-6 md:py-3 rounded-md transition text-sm md:text-base">
                  {hero.button1_label}
                </Link>
                <Link href={hero.button2_href} className="border border-gray-500 hover:border-white text-white font-semibold px-5 py-2.5 md:px-6 md:py-3 rounded-md transition text-sm md:text-base">
                  {hero.button2_label}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Decorative accent strip */}
        <div className="lava-bar" style={{ height: 6 }} />

        {/* ─── Feature section 1 — text left, image right ───────────────────── */}
        {/* Mobile: py-10 (40px). Desktop: md:py-16 (64px). */}
        <section className="bg-black py-10 md:py-16">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1">
              <p className="text-red-500 text-xs md:text-sm font-semibold uppercase tracking-widest mb-3">{feature1.eyebrow}</p>
              <h2 className="text-2xl md:text-4xl font-black text-white leading-tight mb-4" style={{ whiteSpace: "pre-line" }}>
                {feature1.heading}
              </h2>
              <p className="text-sm md:text-base leading-relaxed mb-6 text-gray-400">{feature1.body}</p>
              <Link href={feature1.button_href} className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 md:px-6 md:py-3 rounded-md transition text-sm">
                {feature1.button_label}
              </Link>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-2xl overflow-hidden h-[200px] md:h-[320px]">
                <img src={feature1.image} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Decorative accent strip */}
        <div className="lava-bar" style={{ height: 6 }} />

        {/* ─── Feature section 2 — image left, text right ───────────────────── */}
        {/* Mobile: py-10 (40px). Desktop: md:py-16 (64px). */}
        <section className="bg-black py-10 md:py-16" style={{ borderTop: "1px solid #111" }}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
            <div className="flex-1">
              <p className="text-red-500 text-xs md:text-sm font-semibold uppercase tracking-widest mb-3">{feature2.eyebrow}</p>
              <h2 className="text-2xl md:text-4xl font-black text-white leading-tight mb-4" style={{ whiteSpace: "pre-line" }}>
                {feature2.heading}
              </h2>
              <p className="text-sm md:text-base leading-relaxed mb-6 text-gray-400">{feature2.body}</p>
              <Link href={feature2.button_href} className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 md:px-6 md:py-3 rounded-md transition text-sm">
                {feature2.button_label}
              </Link>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-2xl overflow-hidden h-[200px] md:h-[320px]">
                <img src={feature2.image} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Decorative accent strip */}
        <div className="lava-bar" style={{ height: 6 }} />

        {/* ─── Varumärken ────────────────────────────────────────────────────── */}
        <section className="bg-black py-8 overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide text-center mb-6">Toppvarumärken</h2>

          {/* Mobile: 3-column grid — clean, no overflow */}
          <div className="grid grid-cols-3 gap-3 px-4 md:hidden">
            {brands.map((brand, i) => (
              <Link key={i} href={`/marke/${brand.name.toLowerCase().replace(/\s+/g, "-")}`}
                className="feature-card flex items-center justify-center p-2"
                style={{ height: 64, textDecoration: "none" }}>
                <div className="bg-white rounded flex items-center justify-center w-full h-full" style={{ padding: "4px 6px" }}>
                  <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain" />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: scrolling marquee */}
          <div className="hidden md:block relative">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10"
              style={{ background: "linear-gradient(to right, #000 30%, transparent)" }} />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10"
              style={{ background: "linear-gradient(to left, #000 30%, transparent)" }} />
            <div className="flex items-center animate-marquee" style={{ width: "max-content" }}>
              {[...brands, ...brands].map((brand, i) => (
                <Link key={i} href={`/marke/${brand.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="feature-card mx-3 flex-shrink-0 flex items-center justify-center p-3"
                  style={{ width: 130, height: 76, textDecoration: "none" }}>
                  <div className="bg-white rounded-md flex items-center justify-center" style={{ width: 100, height: 50, padding: "5px 8px" }}>
                    <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain" style={{ maxWidth: 86, maxHeight: 38 }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Varför oss */}
        <section className="bg-black text-white py-12">
          <h2 className="text-[20px] md:text-2xl font-bold text-center mb-10 px-4">Varför välja TurboTeknik?</h2>
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
            {why.cards.map((card: { title: string; desc: string }, i: number) => {
              const Icon = whyIcons[i];
              return (
                <div key={i} className="feature-card flex-1 p-6 md:p-8 text-center">
                  <Icon size={32} className="mx-auto mb-4" color="#DC2626" strokeWidth={1.8} />
                  <h3 className="font-bold text-[14px] md:text-lg mb-2 text-white">{card.title}</h3>
                  <p className="text-gray-400 text-[13px] md:text-sm leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
