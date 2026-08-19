import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Produktkatalog",
  description: "Bläddra i hela TurboTekniks sortiment — turboladdare, patroner (CHRA) och turbodelar från Garrett, BorgWarner, IHI, Mitsubishi och fler.",
  openGraph: { title: "Produktkatalog | TurboTeknik" },
};

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
      <main className="bg-white min-h-screen">

        {/* Banner */}
        <div className="bg-black text-white py-10">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl font-black mb-2">Produktkatalog</h1>
            <p className="text-gray-400 text-sm max-w-xl">
              {fmt(countTotal)} produkter — turboladdare, patroner och reservdelar.
            </p>
          </div>
        </div>

        {/* Category nav */}
        <div className="bg-gray-50 border-b border-gray-200 py-3">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-2">
            {[
              { label: "Turboladdare", href: "/kategori/turboladdare" },
              { label: "Patroner (CHRA)", href: "/kategori/chra" },
              { label: "Turbodelar", href: "/kategori/turbodelar" },
              { label: "Reparationsutrustning", href: "/kategori/utrustning" },
              { label: "Tuning", href: "/kategori/tuning" },
            ].map((c) => (
              <Link key={c.label} href={c.href} className="text-sm text-gray-600 hover:text-red-600 transition font-medium px-3 py-1.5 rounded hover:bg-red-50">
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Parts catalog */}
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {orderedGroups.map(({ name, products }) => (
            <section key={name}>
              {/* Section heading — plain bold, exactly like turbocentras */}
              <h2 className="text-[15px] font-bold text-black mb-3">{name}</h2>

              {/* Product grid — 6 per row on desktop */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-[1px] border border-gray-200 bg-gray-200">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/produkt/${p.id}`}
                    className="bg-white flex flex-col hover:bg-blue-50 transition"
                  >
                    {/* Part code at top — blue link, exactly like turbocentras */}
                    <div className="px-2 pt-2 pb-1">
                      <span className="text-[11px] text-[#0074c2] leading-tight font-normal line-clamp-1">
                        {p.code}
                      </span>
                    </div>

                    {/* Image below the code */}
                    <div className="flex-1 flex items-center justify-center p-2 min-h-[90px]">
                      {p.images[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="max-w-full max-h-[80px] object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-gray-300 text-[10px] text-center leading-tight">
                          No image<br />available
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Brands */}
        <div className="bg-gray-50 border-t border-gray-100 py-10">
          <div className="max-w-6xl mx-auto px-4">
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
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}
