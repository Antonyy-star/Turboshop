import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Produktkatalog",
  description: "Bläddra i hela TurboTekniks sortiment — turboladdare, patroner (CHRA) och turbodelar från Garrett, BorgWarner, IHI, Mitsubishi och fler.",
  openGraph: { title: "Produktkatalog | TurboTeknik" },
};

// Category sections in same order as turbocentras.com catalog
const SECTIONS: { label: string; cats: string[]; href: string }[] = [
  { label: "Core assemblies (CHRA)",          cats: ["CHRA", "Core assemblies (CHRA)"],                                                                                                                      href: "/kategori/chra" },
  { label: "Actuators",                        cats: ["Actuators"],                                                                                                                                           href: "/kategori/turbodelar?subkat=actuators" },
  { label: "Repair kits",                      cats: ["Repair kits"],                                                                                                                                         href: "/kategori/turbodelar?subkat=repair-kits" },
  { label: "Turbine housings / Hot sides",     cats: ["Turbine housings / Hot sides"],                                                                                                                        href: "/kategori/turbodelar?subkat=turbine-housings-hot-sides" },
  { label: "Reversing valves",                 cats: ["Reversing valves"],                                                                                                                                    href: "/kategori/turbodelar?subkat=actuators" },
  { label: "Heat shields",                     cats: ["Heat shields"],                                                                                                                                        href: "/kategori/turbodelar?subkat=heat-shields" },
  { label: "Bearing housings",                 cats: ["Bearing housings"],                                                                                                                                    href: "/kategori/turbodelar?subkat=bearing-housings" },
  { label: "Gaskets & Gasket Kits",            cats: ["Gaskets & Gasket Kits"],                                                                                                                               href: "/kategori/turbodelar?subkat=gaskets-gasket-kits" },
  { label: "Back plates",                      cats: ["Back plates"],                                                                                                                                         href: "/kategori/turbodelar?subkat=back-plates" },
  { label: "Wastegate valves",                 cats: ["Wastegate valves"],                                                                                                                                    href: "/kategori/turbodelar?subkat=wastegate-valves" },
  { label: "Electric motors",                  cats: ["Electric motors"],                                                                                                                                     href: "/kategori/turbodelar?subkat=actuators" },
  { label: "Compressor wheels",                cats: ["Compressor wheels"],                                                                                                                                   href: "/kategori/turbodelar?subkat=compressor-wheels" },
  { label: "Compressor housings / Cold sides", cats: ["Compressor housings / Cold sides"],                                                                                                                    href: "/kategori/turbodelar?subkat=compressor-housings-cold-sides" },
  { label: "Shaft & wheels / Rotors",          cats: ["Shaft & wheels / Rotors"],                                                                                                                             href: "/kategori/turbodelar?subkat=shaft-wheels-rotors" },
  { label: "VNT gaskets & Centring rings",     cats: ["VNT gaskets & Centring rings"],                                                                                                                        href: "/kategori/turbodelar?subkat=vnt-gaskets" },
  { label: "Nozzle ring assemblies",           cats: ["Nozzle ring assemblies", "Unison rings (VNT VGT)", "Nozzle ring retaining sleeves", "Location pins (VNT VGT)", "VNT VGT Nozzle rings"],               href: "/kategori/turbodelar?subkat=nozzle-ring-assemblies" },
  { label: "Bolts, nuts, screws, washers",     cats: ["Bolts, nuts, screws, washers", "Retaining rings", "Lock plates", "Anti-rotation pins", "Oil deflectors", "Retaining screws", "Thrust spacers", "Thrust kits", "Thrust flingers", "Thrust collars", "Thrust washers"], href: "/kategori/turbodelar?subkat=bolts-nuts-screws-washers" },
  { label: "El. Actuator gears",               cats: ["El. Actuator gears"],                                                                                                                                  href: "/kategori/turbodelar?subkat=actuators" },
  { label: "El. actuator shafts",              cats: ["El. actuator shafts"],                                                                                                                                  href: "/kategori/turbodelar?subkat=actuators" },
  { label: "VNT nozzle cages",                 cats: ["VNT nozzle cages"],                                                                                                                                     href: "/kategori/turbodelar?subkat=vnt-nozzle-cages" },
  { label: "Recirculation valves",             cats: ["Recirculation valves"],                                                                                                                                 href: "/kategori/turbodelar?subkat=recirculation-valves" },
  { label: "Shaft nuts",                       cats: ["Shaft nuts"],                                                                                                                                           href: "/kategori/turbodelar?subkat=shaft-nuts" },
  { label: "Seal rings / Piston rings",        cats: ["Seal rings / Piston rings"],                                                                                                                            href: "/kategori/turbodelar?subkat=seal-rings-piston-rings" },
  { label: "O-rings",                          cats: ["O-rings"],                                                                                                                                             href: "/kategori/turbodelar" },
  { label: "Actuator clips",                   cats: ["Actuator clips"],                                                                                                                                       href: "/kategori/turbodelar?subkat=actuator-clips" },
  { label: "Journal bearings",                 cats: ["Journal bearings"],                                                                                                                                     href: "/kategori/turbodelar" },
  { label: "Oil supply systems",               cats: ["Oil supply systems", "Oil feed adaptors", "Oil pipes"],                                                                                                 href: "/kategori/turbodelar?subkat=oil-supply-systems" },
  { label: "EGR gaskets",                      cats: ["EGR gaskets"],                                                                                                                                         href: "/kategori/turbodelar?subkat=egr-gaskets" },
  { label: "Other parts",                      cats: ["Other parts"],                                                                                                                                         href: "/kategori/turbodelar?subkat=other-parts" },
  { label: "Turbochargers",                    cats: ["Turbochargers"],                                                                                                                                       href: "/kategori/turboladdare" },
  { label: "Turbocharger repair equipment",    cats: ["Turbocharger repair equipment"],                                                                                                                       href: "/kategori/utrustning" },
  { label: "Tuning",                           cats: ["Turbocharger tuning", "Tuning"],                                                                                                                       href: "/kategori/tuning" },
  { label: "Injectors",                        cats: ["Injectors"],                                                                                                                                           href: "/kategori/injektorer" },
];

type Prod = { id: string; sku: string; images: string[] };

export default async function KatalogPage() {
  const supabase = createServiceClient();

  const [{ count: countTotal }, { data: raw }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("id, sku, images, category").order("id").limit(10000),
  ]);

  // Group by DB category field
  const byCat: Record<string, Prod[]> = {};
  for (const p of raw ?? []) {
    const cat = p.category ?? "";
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push({ id: String(p.id), sku: p.sku ?? "", images: p.images ?? [] });
  }

  // Build sections — prefer products with images, show up to 12
  const sections = SECTIONS.map((sec) => {
    const all = sec.cats.flatMap((c) => byCat[c] ?? []);
    const sorted = [...all.filter((p) => p.images[0]), ...all.filter((p) => !p.images[0])];
    return { ...sec, products: sorted.slice(0, 12), total: all.length };
  }).filter((s) => s.total > 0);

  const fmt = (n: number | null) => (n ?? 0).toLocaleString("sv-SE");

  return (
    <>
      <Header />
      <main style={{ background: "#fff", minHeight: "100vh", color: "#111", fontFamily: "inherit" }}>

        {/* Top banner */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "20px 0" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Produktkatalog</h1>
            <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>
              {fmt(countTotal)} produkter — turboladdare, patroner och reservdelar.
            </p>
          </div>
        </div>

        {/* Category sections — matches turbocentras.com layout exactly */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 20px 60px" }}>
          {sections.map((sec) => (
            <div key={sec.label} style={{ marginBottom: 32 }}>

              {/* Section heading */}
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 10px 0" }}>
                {sec.label}
              </h2>

              {/* Product cards */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {sec.products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/produkt/${p.id}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: 112,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      textDecoration: "none",
                      flexShrink: 0,
                    }}
                  >
                    {/* SKU */}
                    <div style={{ padding: "3px 5px", borderBottom: "1px solid #e5e7eb" }}>
                      <span style={{
                        fontSize: 10,
                        color: "#0891b2",
                        fontWeight: 500,
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: "1.3",
                      }}>
                        {p.sku || "—"}
                      </span>
                    </div>
                    {/* Image */}
                    <div style={{
                      width: 112,
                      height: 90,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      padding: 5,
                    }}>
                      {p.images[0] ? (
                        <Image
                          src={p.images[0]}
                          alt={p.sku}
                          width={100}
                          height={80}
                          style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
                          loading="lazy"
                          quality={75}
                        />
                      ) : (
                        <span style={{ fontSize: 9, color: "#9ca3af", textAlign: "center", lineHeight: 1.4 }}>
                          No image<br />available
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
