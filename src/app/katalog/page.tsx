import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { Cpu, Layers, Wrench, Settings, Zap } from "lucide-react";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Produktkatalog",
  description: "Bläddra i hela TurboTekniks sortiment — turboladdare, patroner (CHRA) och turbodelar från Garrett, BorgWarner, IHI, Mitsubishi och fler.",
  openGraph: { title: "Produktkatalog | TurboTeknik" },
};

const categories = [
  { label: "Turboladdare",          href: "/kategori/turboladdare", Icon: Zap },
  { label: "Patroner (CHRA)",       href: "/kategori/chra",         Icon: Cpu },
  { label: "Turbodelar",            href: "/kategori/turbodelar",   Icon: Layers },
  { label: "Reparationsutrustning", href: "/kategori/utrustning",   Icon: Wrench },
  { label: "Tuning",                href: "/kategori/tuning",       Icon: Settings },
];

const allBrands = [
  { name: "Garrett",      href: "/marke/garrett",      logo: "/brands/kisspng-turbocharger-garrett-airesearch-business-engine-in-garrett-5b3dfc697c5e14.6655578415307889695094.jpg" },
  { name: "BorgWarner",   href: "/marke/borgwarner",   logo: "/brands/BorgWarner.png.webp" },
  { name: "Mitsubishi",   href: "/marke/mitsubishi",   logo: "/brands/Mitsubishi_logo.svg" },
  { name: "Holset",       href: "/marke/holset",       logo: "/brands/hol10652_10.jpg" },
  { name: "IHI",          href: "/marke/ihi",          logo: "/brands/IHI_square.png.avif" },
  { name: "Toyota",       href: "/marke/toyota",       logo: "/brands/kisspng-toyota-corolla-car-toyota-motor-sales-u-s-a-inc-1713918574954.webp" },
  { name: "BMTS",         href: "/marke/bmts",         logo: "/brands/BMTS.jpeg" },
  { name: "Hitachi",      href: "/marke/hitachi",      logo: "/brands/Hitachi-Logo.png" },
  { name: "Valeo",        href: "/marke/valeo",        logo: "/brands/Valeo_Logo.svg.png" },
  { name: "Continental",  href: "/marke/continental",  logo: "/brands/continental-logo-png_seeklogo-270061.png" },
  { name: "CZ Turbo",     href: "/marke/cz-turbo",     logo: "/brands/Logo_CZ.jpg" },
  { name: "Master Power", href: "/marke/master",       logo: "/brands/master2.png" },
  { name: "EE Turbo",     href: "/marke/ee-turbo",     logo: "" },
  { name: "TurboCentras", href: "/marke/turbocentras", logo: "" },
  { name: "Bosch",        href: "/marke/bosch",        logo: "" },
  { name: "Mahle",        href: "/marke/mahle",        logo: "" },
  { name: "Hella",        href: "/marke/hella",        logo: "" },
  { name: "Pierburg",     href: "/marke/pierburg",     logo: "" },
  { name: "Marelli",      href: "/marke/marelli",      logo: "" },
  { name: "Sonceboz",     href: "/marke/sonceboz",     logo: "" },
];

const TYPE_PREFIXES = [
  "Bearing housing ",
  "Compressor wheel ",
  "Compressor plate ",
  "Compressor housing ",
  "Shaft and wheel ",
  "Shaft nut ",
  "Heat shield ",
  "Nozzle ring assembly ",
  "Nozzle ring ",
  "VNT outer nozzle cage ",
  "VNT nozzle cage ",
  "VNT outer ",
  "VNT ",
  "Repair kit ",
  "Gasket kit ",
  "Gasket oil outlet ",
  "Gasket oil ",
  "Gasket set ",
  "Gasket ",
  "Piston ring ",
  "Seal ring ",
  "Wastegate valve ",
  "Turbine housing ",
  "Thrust bearing ",
  "Thrust flinger ",
  "Thrust washer ",
  "Retaining ring ",
  "Retaining screw ",
  "Lock plate ",
  "Anti-rotation pin ",
  "Actuator clip ",
  "Actuator rod ",
  "Electric actuator ",
  "Actuator connector ",
  "Actuator bearing ",
  "Actuator ",
  "Recirculation valve ",
  "Oil deflector ",
  "Cartridge ",
  "Back plate ",
];

function getPartCode(name: string): string {
  for (const prefix of TYPE_PREFIXES) {
    if (name.startsWith(prefix)) return name.slice(prefix.length);
  }
  return name;
}

function classifyPart(name: string, category: string): string {
  if (category === "CHRA") return "Core assemblies (CHRA)";
  const n = name.toLowerCase();
  if (n.startsWith("bearing housing")) return "Bearing housings";
  if (n.startsWith("compressor wheel")) return "Compressor wheels";
  if (n.startsWith("compressor plate")) return "Compressor plate";
  if (n.startsWith("compressor housing")) return "Compressor housings / Cold sides";
  if (n.startsWith("shaft and")) return "Shaft & wheels / Rotors";
  if (n.startsWith("shaft nut")) return "Shaft nuts";
  if (n.startsWith("heat shield")) return "Heat shields";
  if (n.startsWith("nozzle ring")) return "Nozzle ring assemblies";
  if (n.startsWith("vnt")) return "VNT nozzle cages";
  if (n.startsWith("repair kit")) return "Repair kits";
  if (n.startsWith("gasket")) return "Gaskets & Gasket Kits";
  if (n.startsWith("piston ring")) return "Seal rings / Piston rings";
  if (n.startsWith("wastegate valve")) return "Wastegate valves";
  if (n.startsWith("turbine housing")) return "Turbine housings / Hot sides";
  if (n.startsWith("thrust bearing") || n.startsWith("thrust flinger") || n.startsWith("thrust washer")) return "Thrust bearings";
  if (n.startsWith("retaining") || n.startsWith("lock plate") || n.startsWith("anti-rotation") || n.startsWith("oil deflector")) return "Bolts, nuts, screws, washers";
  if (n.startsWith("actuator clip")) return "Actuator clips";
  if (n.startsWith("actuator rod")) return "Actuator rods";
  if (n.startsWith("electric actuator")) return "Electric motors";
  if (n.startsWith("actuator")) return "Actuators";
  if (n.startsWith("recirculation")) return "Recirculation valves";
  return "Övriga delar";
}

const SUBCATEGORY_ORDER = [
  "Core assemblies (CHRA)",
  "Bearing housings",
  "Compressor wheels",
  "Shaft & wheels / Rotors",
  "Heat shields",
  "Nozzle ring assemblies",
  "VNT nozzle cages",
  "Actuators",
  "Actuator clips",
  "Actuator rods",
  "Electric motors",
  "Wastegate valves",
  "Repair kits",
  "Gaskets & Gasket Kits",
  "Shaft nuts",
  "Compressor plate",
  "Compressor housings / Cold sides",
  "Turbine housings / Hot sides",
  "Thrust bearings",
  "Seal rings / Piston rings",
  "Bolts, nuts, screws, washers",
  "Recirculation valves",
  "Övriga delar",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Product = { id: string; name: string; code: string; images: string[] };

export default async function KatalogPage() {
  const supabase = createServiceClient();

  const [{ count: countTotal }, { data: partsRaw }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id, name, images, category")
      .in("category", ["Turbodelar", "CHRA"])
      .order("name")
      .limit(5000),
  ]);

  const groups: Record<string, Product[]> = {};
  for (const p of partsRaw ?? []) {
    const sub = classifyPart(p.name ?? "", p.category ?? "");
    if (!groups[sub]) groups[sub] = [];
    groups[sub].push({
      id: String(p.id),
      name: p.name ?? "",
      code: getPartCode(p.name ?? ""),
      images: p.images ?? [],
    });
  }

  const orderedGroups = SUBCATEGORY_ORDER
    .filter((cat) => groups[cat]?.length > 0)
    .map((cat) => ({ name: cat, products: groups[cat] }));

  const fmt = (n: number | null) => (n ?? 0).toLocaleString("sv-SE");

  return (
    <>
      <Header />
      <main className="bg-[#0a0a0a] min-h-screen text-white">

        {/* Banner */}
        <div className="bg-black border-b border-[#1a1a1a] py-10">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-red-500 text-xs font-semibold uppercase tracking-widest mb-2">Komplett sortiment</p>
            <h1 className="text-3xl md:text-4xl font-black mb-2">Produktkatalog</h1>
            <p className="text-gray-500 text-sm">{fmt(countTotal)} produkter — turboladdare, patroner och reservdelar.</p>
          </div>
        </div>

        <div className="lava-bar" style={{ height: 4 }} />

        {/* Category cards */}
        <section className="bg-black border-b border-[#1a1a1a] py-8">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4">Bläddra efter kategori</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {categories.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="feature-card p-4 flex flex-col gap-2 hover:border-red-600 transition group"
                >
                  <Icon size={20} className="text-red-600" strokeWidth={1.8} />
                  <span className="font-bold text-sm text-white group-hover:text-red-400 transition leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Parts catalog — subcategory cards */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-5">Reservdelar & komponenter</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {orderedGroups.map(({ name, products }) => {
              const previews = products.filter((p) => p.images[0]).slice(0, 3);
              const categoryHref = name === "Core assemblies (CHRA)" ? "/kategori/chra" : "/kategori/turbodelar";
              return (
                <Link
                  key={name}
                  href={categoryHref}
                  className="feature-card p-4 flex flex-col gap-3 hover:border-red-600 transition group"
                >
                  {/* Image previews */}
                  <div className="flex gap-1.5">
                    {previews.length > 0 ? previews.map((p, i) => (
                      <div key={i} className="w-12 h-12 rounded bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#2a2a2a]">
                        <img src={p.images[0]} alt="" className="max-w-full max-h-full object-contain p-1" loading="lazy" />
                      </div>
                    )) : (
                      <div className="w-12 h-12 rounded bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                        <span className="text-gray-700 text-xs">—</span>
                      </div>
                    )}
                  </div>

                  {/* Name + count */}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white leading-snug group-hover:text-red-400 transition">{name}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{products.length.toLocaleString("sv-SE")} delar</p>
                  </div>

                  <span className="text-[11px] text-red-600 font-semibold group-hover:text-red-400 transition">Bläddra →</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Brands */}
        <div className="border-t border-[#1a1a1a] py-10">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-5">Varumärken</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allBrands.map((brand) => (
                <Link
                  key={brand.name}
                  href={brand.href}
                  className="feature-card p-4 flex flex-col items-center justify-center gap-2 hover:border-red-600 transition min-h-[72px] group"
                >
                  {brand.logo ? (
                    <>
                      <div className="bg-white rounded flex items-center justify-center" style={{ width: 80, height: 34, padding: "4px 8px" }}>
                        <img src={brand.logo} alt={brand.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <span className="text-[11px] text-gray-500 group-hover:text-gray-300 transition">{brand.name}</span>
                    </>
                  ) : (
                    <span className="font-bold text-sm text-gray-400 group-hover:text-white transition text-center">{brand.name}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}
