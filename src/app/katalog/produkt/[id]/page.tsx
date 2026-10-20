import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AddToCartButton from "@/components/AddToCartButton";
import CatalogThumbs from "@/components/catalog/CatalogThumbs";
import { InfoBox, InfoRow } from "@/components/catalog/InfoBox";
import { QuickViewFrameBridge } from "@/components/catalog/QuickView";
import Link from "next/link";
import { getProductById } from "@/lib/realProducts";
import { getRealProductById } from "@/lib/parseProducts";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";


type Specs = {
  series?: string | null;
  model?: string | null;
  technology?: string | null;
  actuation?: string | null;
  reference?: string | null;
  turbo_numbers?: { type: string; number: string }[];
  replacements?: string[];
  interchangeable_with?: string[];
  turbo_parts?: { type: string; sku: string; url?: string }[];
  features?: string[];
  used_in?: string[]; // turbochargers this part fits (from the Turbocentras API)
};

function hasCyrillic(text: string) {
  return /[Ѐ-ӿ]/.test(text);
}

function extractSku(text: string): string | null {
  const m = text.match(/\b([0-9]{4,}[0-9A-Z-]*[0-9A-Z])\b/i);
  return m ? m[1] : null;
}

// Parse the raw HTML description_short stored in description field.
// Returns alternative part numbers, turbocharger OEM compatibility list, and clean remark.
function parseDescriptionHtml(html: string, mainSku: string) {
  if (!html) return { altNumbers: [] as string[], turbos: [] as string[], remark: "" };

  const stripHtml = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

  // Extract <p> paragraphs; fall back to full text if no <p> tags
  const raw = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [html];
  const paragraphs = raw.map(p => stripHtml(p)).filter(p => p.length > 2);

  const altNumbers: string[] = [];
  const turbos: string[] = [];
  const remarkLines: string[] = [];

  for (const para of paragraphs) {
    if (hasCyrillic(para)) continue;
    if (/see below|more info/i.test(para)) continue;
    if (/TurboCentras|Data updated/i.test(para)) continue;

    // "for turbos A, B, C" / "for turbo A, B, C"
    const turboMatch = para.match(/for turbos?\s+(.+?)\.?\s*$/i);
    if (turboMatch) {
      turbos.push(...turboMatch[1].split(",").map(s => s.trim()).filter(Boolean));
      continue;
    }

    // Comma-separated part codes: all CAPS / digits / hyphens, at least 2 items
    // Matches "IH-00-0035, RHF5-088, RHF5-219" but not sentences
    if (/^[A-Z0-9][A-Z0-9\-]+(?:,\s*[A-Z0-9][A-Z0-9\-]+)+$/.test(para)) {
      const codes = para.split(",")
        .map(s => s.trim())
        .filter(c => c.length > 2 && c.toUpperCase() !== mainSku.toUpperCase());
      altNumbers.push(...codes);
      continue;
    }

    remarkLines.push(para);
  }

  return { altNumbers, turbos, remark: remarkLines.join("\n") };
}

function getPartType(category: string): string {
  const map: Record<string, string> = {
    "CHRA":                           "Cartridge",
    "Core assemblies (CHRA)":         "Cartridge",
    "Turbochargers":                  "Turbocharger",
    "Compressor wheels":              "Compressor wheel",
    "Repair kits":                    "Repair kit",
    "Gaskets & Gasket Kits":          "Gasket kit",
    "Nozzle ring assemblies":         "Nozzle ring assembly",
    "Shaft & wheels / Rotors":        "Shaft & wheel / Rotor",
    "Bearing housings":               "Bearing housing",
    "Heat shields":                   "Heat shield",
    "Turbine housings / Hot sides":   "Turbine housing",
    "Compressor housings / Cold sides":"Compressor housing",
    "Bolts, nuts, screws, washers":   "Bolt / nut / screw",
    "VNT gaskets & Centring rings":   "VNT gasket",
    "Actuators":                      "Actuator",
    "Back plates":                    "Back plate",
    "Wastegate valves":               "Wastegate valve",
    "VNT nozzle cages":               "VNT nozzle cage",
    "Recirculation valves":           "Recirculation valve",
    "Shaft nuts":                     "Shaft nut",
    "Seal rings / Piston rings":      "Seal ring / Piston ring",
    "O-rings":                        "O-ring",
    "Actuator clips":                 "Actuator clip",
    "Electric motors":                "Electric motor",
    "Turbocharger repair equipment":  "Repair equipment",
    "Tuning":                         "Tuning part",
    "Injectors":                      "Injector",
  };
  return map[category] || category || "—";
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("products")
    .select("name,brand,sku,description,images")
    .eq("id", id)
    .single();
  if (!data) return { title: "Produkt" };
  const title = `${data.name}${data.brand ? ` — ${data.brand}` : ""}`;
  const plain = (data.description ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/s+/g, " ").trim();
  const description = plain.slice(0, 160) ||
    `Köp ${data.name} från ${data.brand ?? "TurboTeknik"}. Artikelnummer: ${data.sku ?? id}.`;
  return {
    title,
    description,
    alternates: { canonical: `/produkt/${id}` },
    openGraph: {
      title,
      description,
      images: data.images?.[0] ? [{ url: data.images[0] }] : [],
    },
  };
}

// Catalog view of a part, like turbocentras.com/catalog/turboparts/<ref>.
// Opened from the catalog (new tab) and as a quick view from the catalog search
// (?vy=snabb: no header or footer). The normal shop page is /produkt/[id].
export default async function CatalogPartPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vy?: string }>;
}) {
  const { id } = await params;
  const quick = (await searchParams).vy === "snabb";

  const supabase = createServiceClient();
  const { data: dbProduct } = await supabase.from("products").select("*").eq("id", id).single();

  const product = dbProduct
    ? {
        id: dbProduct.id,
        name: dbProduct.name,
        brand: dbProduct.brand ?? "",
        price: dbProduct.price,
        originalPrice: dbProduct.original_price ?? null,
        sku: dbProduct.sku ?? "",
        images: dbProduct.images ?? [],
        badge: dbProduct.badge ?? null,
        description: dbProduct.description ?? "",
        in_stock: dbProduct.in_stock !== false,
        category: dbProduct.category ?? "",
      }
    : { ...(getRealProductById(id) ?? getProductById(id)), in_stock: true, category: "" };

  if (!product) notFound();

  const specs: Specs | null = dbProduct?.specs ?? null;

  // Resolve SKUs referenced in specs to internal product IDs
  const skuToProduct: Record<string, { id: string; brand: string }> = {};
  if (specs) {
    const refs: string[] = [];
    specs.replacements?.forEach(r => { const s = extractSku(r); if (s) refs.push(s); });
    specs.interchangeable_with?.forEach(r => { const s = extractSku(r); if (s) refs.push(s); });
    specs.used_in?.forEach(r => { const s = extractSku(r); if (s) refs.push(s); });
    specs.turbo_parts?.forEach(p => refs.push(p.sku));

    if (refs.length > 0) {
      const unique = [...new Set(refs)];
      const { data: exact } = await supabase.from("products").select("id, sku, brand").in("sku", unique);
      (exact ?? []).forEach((p: { id: string | number; sku: string; brand: string }) => { skuToProduct[p.sku.toUpperCase()] = { id: String(p.id), brand: p.brand }; });

      const unmatched = unique.filter(s => !skuToProduct[s.toUpperCase()]);
      if (unmatched.length > 0) {
        const { data: prefix } = await supabase.from("products").select("id, sku, brand")
          .or(unmatched.map(s => `sku.ilike.${s}%`).join(","));
        (prefix ?? []).forEach((p: { id: string | number; sku: string; brand: string }) => {
          unmatched.forEach(s => {
            if (p.sku.toUpperCase().startsWith(s.toUpperCase()) && !skuToProduct[s.toUpperCase()])
              skuToProduct[s.toUpperCase()] = { id: String(p.id), brand: p.brand };
          });
        });
      }
    }
  }

  const partType = getPartType(product.category);

  // Parse description HTML to extract alternative numbers, turbo compatibility, remark
  const { altNumbers: descAltNumbers, turbos: descTurbos, remark: descRemark } =
    parseDescriptionHtml(product.description ?? "", product.sku);

  // Merge: specs.turbo_numbers take priority, fall back to description-parsed alt numbers
  const specAltNumbers = specs?.turbo_numbers ?? [];
  const altNumbers = specAltNumbers.length > 0
    ? specAltNumbers.map(n => ({ label: n.type, value: n.number }))
    : descAltNumbers.map(n => ({ label: "", value: n }));

  // Used in turbochargers: from specs.replacements first, then parsed from description
  const usedInTurbos: string[] = specs?.used_in?.length
    ? specs.used_in
    : specs?.replacements?.length
    ? specs.replacements
    : specs?.interchangeable_with?.length
      ? specs.interchangeable_with
      : descTurbos;

  // Catalog turbo pages for the turbochargers this part fits
  const turboRefs = [...new Set(usedInTurbos.map(r => extractSku(r)).filter((x): x is string => !!x))];
  const turboPage: Record<string, number> = {};
  for (let i = 0; i < turboRefs.length; i += 200) {
    const { data } = await supabase.from("catalog_turbos").select("id, reference").in("reference", turboRefs.slice(i, i + 200));
    for (const t of data ?? []) if (t.reference) turboPage[t.reference.toUpperCase()] ??= t.id;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    image: product.images?.[0] ?? undefined,
    description: product.description?.slice(0, 200) || undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "SEK",
      price: product.price,
      availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "TurboTeknik" },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {!quick && <Header />}
      <main style={{ background: "#f5f5f5", minHeight: quick ? undefined : "100vh", color: "#111" }}>

        {/* Breadcrumb */}
        {!quick && <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 0" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", display: "flex", gap: 6, fontSize: 12, color: "#666", flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/" style={{ color: "#0891b2", textDecoration: "none" }}>Hem</Link>
            <span>›</span>
            <Link href="/katalog" style={{ color: "#0891b2", textDecoration: "none" }}>Katalog</Link>
            <span>›</span>
            <span style={{ color: "#111", fontWeight: 600, textTransform: "uppercase" }}>
              {product.sku || product.name}
            </span>
          </div>
        </div>}

        {/* Page title (the quick view window shows it in its own header) */}
        {!quick && <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 20px 12px" }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111", margin: 0 }}>
            {partType} {product.sku}
          </h1>
        </div>}

        {/* Card grid */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: quick ? "12px 12px 16px" : "0 20px 48px", display: "flex", flexDirection: "column", gap: 4 }}>

          {/* ROW 1: 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 4 }}>

            {/* MAIN INFO */}
            <InfoBox title={`${product.sku} Main Info`}>
              <InfoRow label="Part type"  value={partType} />
              <InfoRow label="Part brand" value={product.brand || "—"} />
              <InfoRow label="Reference"  value={product.sku || "—"} />
              {specs?.series    && <InfoRow label="Series"      value={specs.series} />}
              {specs?.model     && <InfoRow label="Model"       value={specs.model} />}
              {specs?.technology && <InfoRow label="Technology" value={specs.technology} />}
              {specs?.actuation  && <InfoRow label="Actuation"  value={specs.actuation} />}
            </InfoBox>

            {/* ALTERNATIVE NUMBERS */}
            <InfoBox title="Alternative Numbers">
              {altNumbers.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {altNumbers.map((n, i) => (
                    <div key={i} style={{ fontSize: 12 }}>
                      {n.label && <span style={{ color: "#666" }}>{n.label}: </span>}
                      <span style={{ fontWeight: 500 }}>{n.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ color: "#888", fontSize: 12 }}>No alternative numbers available</span>
              )}
            </InfoBox>

            {/* USED IN TURBOCHARGERS */}
            <InfoBox title="Used in Turbochargers">
              {usedInTurbos.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {usedInTurbos.map((r, i) => {
                    const rSku = extractSku(r);
                    const turboId = rSku ? turboPage[rSku.toUpperCase()] : undefined;
                    if (!rSku || turboId === undefined) {
                      return <div key={i} style={{ fontSize: 12, color: "#333" }}>{r}</div>;
                    }
                    const [before, ...rest] = r.split(rSku);
                    return (
                      <div key={i} style={{ fontSize: 12, color: "#333" }}>
                        {before}
                        <Link href={`/katalog/turbo/${turboId}`} target={quick ? "_top" : undefined} style={{ color: "#0891b2", textDecoration: "none" }}>{rSku}</Link>
                        {rest.join(rSku)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span style={{ color: "#888", fontSize: 12 }}>No compatibility data available</span>
              )}
            </InfoBox>

            {/* PART PROPERTIES */}
            <InfoBox title="Part Properties">
              {specs?.features?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {specs.features.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#333" }}>• {f}</div>
                  ))}
                </div>
              ) : (
                <span style={{ color: "#888", fontSize: 12 }}>No part properties available</span>
              )}
            </InfoBox>

          </div>

          {/* ROW 2: 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 4 }}>

            {/* REMARK */}
            <InfoBox title={`${product.sku} Remark`}>
              {descRemark ? (
                <p style={{ fontSize: 12, color: "#444", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                  {descRemark}
                </p>
              ) : (
                <span style={{ color: "#888", fontSize: 12 }}>No part remark available</span>
              )}
            </InfoBox>

            {/* SHOPPING */}
            <InfoBox title={`Shopping — ${product.sku}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: "#666" }}>Reference: </span>
                  <span style={{ fontWeight: 600 }}>{product.sku}</span>
                </div>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: "#666" }}>Price: </span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{Number(product.price).toLocaleString("sv-SE")} kr</span>
                  {product.originalPrice && (
                    <span style={{ color: "#999", textDecoration: "line-through", marginLeft: 6, fontSize: 12 }}>
                      {Number(product.originalPrice).toLocaleString("sv-SE")} kr
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: product.in_stock ? "#16a34a" : "#dc2626" }}>
                  {product.in_stock ? "In stock" : "Out of stock"}
                </div>
                <AddToCartButton
                  product={{
                    id: String(product.id),
                    name: product.name,
                    brand: product.brand ?? "",
                    sku: product.sku,
                    price: product.price,
                    image: product.images?.[0] ?? "",
                  }}
                />
              </div>
            </InfoBox>

            {/* PART IMAGES */}
            <InfoBox title={`${product.sku} Part Images`}>
              <CatalogThumbs images={product.images ?? []} sku={product.sku || product.name} />
            </InfoBox>

          </div>

          {/* ROW 3: full width — PART ASSEMBLIES */}
          <InfoBox title="Part Assemblies">
            {specs?.turbo_parts?.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Brand", "Part type", "Reference", "Qty", "OE Number"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {specs.turbo_parts.map((p, i) => {
                      const pMatch = skuToProduct[p.sku.toUpperCase()];
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "6px 10px", color: "#555" }}>{pMatch?.brand ?? "—"}</td>
                          <td style={{ padding: "6px 10px", color: "#555" }}>{p.type.replace(p.sku, "").replace(/\s*:\s*$/, "").trim() || p.type}</td>
                          <td style={{ padding: "6px 10px" }}>
                            {pMatch ? (
                              <Link target={quick ? "_top" : undefined} href={`/katalog/produkt/${pMatch.id}`} style={{ color: "#0891b2", textDecoration: "none", fontWeight: 600 }}>{p.sku}</Link>
                            ) : (
                              <span style={{ color: "#0891b2", fontWeight: 600 }}>{p.sku}</span>
                            )}
                          </td>
                          <td style={{ padding: "6px 10px", color: "#555", textAlign: "center" }}>1</td>
                          <td style={{ padding: "6px 10px", color: "#aaa" }}>—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <span style={{ color: "#888", fontSize: 12 }}>
                No part assemblies available for {product.sku}
              </span>
            )}
          </InfoBox>

        </div>
      </main>
      {!quick && <Footer />}
      {quick && <QuickViewFrameBridge />}
    </>
  );
}
