import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/ImageGallery";
import AddToCartButton from "@/components/AddToCartButton";
import Price from "@/components/Price";
import Link from "next/link";
import { getProductById } from "@/lib/realProducts";
import { getRealProductById } from "@/lib/parseProducts";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 600;

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

type SkuMap = Record<string, { id: string; brand: string }>;

function hasCyrillic(text: string) {
  return /[Ѐ-ӿ]/.test(text);
}

function extractSku(text: string): string | null {
  const m = text.match(/\b([0-9]{4,}[0-9A-Z-]*[0-9A-Z])\b/i);
  return m ? m[1] : null;
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

// The description comes from the Turbocentras API as HTML. Pull out the
// alternative part numbers, the turbochargers it fits, and the readable remark.
function parseDescriptionHtml(html: string, mainSku: string) {
  if (!html) return { altNumbers: [] as string[], turbos: [] as string[], remark: "" };

  const raw = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? html.split(/\n+/);
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

    // Comma-separated part codes ("IH-00-0035, RHF5-088"), not sentences
    if (/^[A-Z0-9][A-Z0-9\-]+(?:,\s*[A-Z0-9][A-Z0-9\-]+)+$/.test(para)) {
      altNumbers.push(...para.split(",")
        .map(s => s.trim())
        .filter(c => c.length > 2 && c.toUpperCase() !== mainSku.toUpperCase()));
      continue;
    }

    remarkLines.push(para);
  }

  return { altNumbers, turbos, remark: remarkLines.join("\n") };
}

// Breadcrumb: the shop's top-level category for a product's database category.
function topCategory(category: string): { href: string; label: string } {
  switch (category) {
    case "Turbochargers":                 return { href: "/kategori/turboladdare", label: "Turboladdare" };
    case "CHRA":
    case "Core assemblies (CHRA)":        return { href: "/kategori/chra",         label: "CHRA" };
    case "Turbocharger repair equipment": return { href: "/kategori/utrustning",   label: "Utrustning" };
    case "Turbocharger tuning":
    case "Tuning":                        return { href: "/kategori/tuning",       label: "Tuning" };
    case "Injectors":                     return { href: "/kategori/injektorer",   label: "Injektorer" };
    default:                              return { href: "/kategori/turbodelar",   label: "Turbodelar" };
  }
}

function partLabel(p: { type: string; sku: string }) {
  return p.type.replace(p.sku, "").replace(/\s*:\s*$/, "").trim() || p.type;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 mr-3">{label}</span>
      <span className="text-xs font-semibold text-black text-right">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2 pt-3 border-t border-gray-100">
      {children}
    </h3>
  );
}

function ProductLink({ text, skuToProduct, className }: { text: string; skuToProduct: SkuMap; className?: string }) {
  const sku = extractSku(text);
  const match = sku ? skuToProduct[sku.toUpperCase()] : null;
  return match
    ? <Link href={`/produkt/${match.id}`} className={`text-red-600 hover:underline font-medium ${className ?? ""}`}>{text}</Link>
    : <span className={`text-gray-700 ${className ?? ""}`}>{text}</span>;
}

function SpecsPanel({ specs, sku, altNumbers, usedIn, skuToProduct }: {
  specs: Specs;
  sku: string;
  altNumbers: { label: string; value: string }[];
  usedIn: string[];
  skuToProduct: SkuMap;
}) {
  const header = [specs.series, sku].filter(Boolean).join(" · ");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-fit lg:sticky lg:top-24">
      {header && (
        <div className="bg-gray-900 text-white px-4 py-3">
          <p className="text-xs font-bold tracking-wide">{header}</p>
        </div>
      )}
      <div className="px-4 py-4 lg:max-h-[80vh] overflow-y-auto">
        {specs.series     && <SpecRow label="Series"     value={specs.series} />}
        {specs.model      && <SpecRow label="Model"      value={specs.model} />}
        {specs.technology && <SpecRow label="Technology" value={specs.technology} />}
        {specs.actuation  && <SpecRow label="Actuation"  value={specs.actuation} />}
        {specs.reference  && <SpecRow label="Reference"  value={specs.reference} />}

        {altNumbers.length > 0 && (
          <>
            <SectionTitle>Turbo Numbers</SectionTitle>
            <div className="space-y-1">
              {altNumbers.map((n, i) => (
                <div key={i} className="flex justify-between items-start gap-2">
                  {n.label && <span className="text-[11px] text-gray-400 shrink-0">{n.label}</span>}
                  <span className="text-[11px] font-mono font-medium text-black text-right ml-auto">{n.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {usedIn.length > 0 && (
          <>
            <SectionTitle>Used in Turbochargers</SectionTitle>
            <div className="space-y-1">
              {usedIn.map((r, i) => (
                <p key={i} className="text-[11px] leading-snug">
                  <ProductLink text={r} skuToProduct={skuToProduct} />
                </p>
              ))}
            </div>
          </>
        )}

        {!!specs.interchangeable_with?.length && (
          <>
            <SectionTitle>Interchangeable With</SectionTitle>
            <div className="space-y-1">
              {specs.interchangeable_with.map((r, i) => (
                <p key={i} className="text-[11px] leading-snug">
                  <ProductLink text={r} skuToProduct={skuToProduct} />
                </p>
              ))}
            </div>
          </>
        )}

        {!!specs.turbo_parts?.length && (
          <>
            <SectionTitle>Turbo Parts</SectionTitle>
            <div className="space-y-1.5">
              {specs.turbo_parts.map((p, i) => {
                const pMatch = skuToProduct[p.sku.toUpperCase()];
                return (
                  <div key={i} className="flex justify-between items-center gap-2">
                    <span className="text-[11px] text-gray-500">{partLabel(p)}</span>
                    {pMatch ? (
                      <Link href={`/produkt/${pMatch.id}`} className="text-[11px] font-mono font-semibold text-red-600 hover:underline">{p.sku}</Link>
                    ) : (
                      <span className="text-[11px] font-mono font-semibold text-red-600">{p.sku}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
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
  const text = data.description ? stripHtml(data.description) : "";
  const description = (!hasCyrillic(text) && text.slice(0, 160)) ||
    `Köp ${data.name} från ${data.brand ?? "TurboTeknik"}. Artikelnummer: ${data.sku ?? id}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: data.images?.[0] ? [{ url: data.images[0] }] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  const specs: Specs = dbProduct?.specs ?? {};

  // Alternative numbers and compatible turbos: structured specs first, then
  // whatever can be read from the description.
  const { altNumbers: descAltNumbers, turbos: descTurbos, remark } =
    parseDescriptionHtml(product.description ?? "", product.sku);

  const altNumbers = specs.turbo_numbers?.length
    ? specs.turbo_numbers.map(n => ({ label: n.type, value: n.number }))
    : descAltNumbers.map(n => ({ label: "", value: n }));

  const usedIn: string[] = specs.used_in?.length
    ? specs.used_in
    : specs.replacements?.length
      ? specs.replacements
      : descTurbos;

  const hasSpecs = !!(
    specs.series || specs.model || specs.technology || specs.actuation || specs.reference ||
    altNumbers.length || usedIn.length || specs.interchangeable_with?.length || specs.turbo_parts?.length
  );

  // Link referenced part numbers to our own product pages.
  const skuToProduct: SkuMap = {};
  const refs: string[] = [];
  usedIn.forEach(r => { const s = extractSku(r); if (s) refs.push(s); });
  specs.interchangeable_with?.forEach(r => { const s = extractSku(r); if (s) refs.push(s); });
  specs.turbo_parts?.forEach(p => refs.push(p.sku));

  if (refs.length > 0) {
    const unique = [...new Set(refs)];
    const { data: exact } = await supabase.from("products").select("id, sku, brand").in("sku", unique);
    (exact ?? []).forEach((p: { id: string | number; sku: string; brand: string }) => {
      skuToProduct[p.sku.toUpperCase()] = { id: String(p.id), brand: p.brand };
    });

    const unmatched = unique.filter(s => !skuToProduct[s.toUpperCase()]);
    if (unmatched.length > 0) {
      const { data: prefix } = await supabase.from("products").select("id, sku, brand")
        .or(unmatched.map(s => `sku.ilike.${s}%`).join(","));
      (prefix ?? []).forEach((p: { id: string | number; sku: string; brand: string }) => {
        unmatched.forEach(s => {
          if (p.sku.toUpperCase().startsWith(s.toUpperCase()) && !skuToProduct[s.toUpperCase()]) {
            skuToProduct[s.toUpperCase()] = { id: String(p.id), brand: p.brand };
          }
        });
      });
    }
  }

  const oemNumbers = specs.turbo_numbers?.filter(n =>
    n.type.toUpperCase().includes("OEM") || n.type.toUpperCase().includes("REF")
  ) ?? [];

  const crumb = topCategory(product.category);
  const brandSlug = product.brand ? product.brand.toLowerCase().replace(/\s+/g, "-") : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    image: product.images?.[0] ?? undefined,
    description: remark.slice(0, 200) || undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "SEK",
      price: product.price,
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "TurboTeknik" },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="bg-gray-50 min-h-screen">

        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-red-600 transition">Hem</Link>
            <span>›</span>
            <Link href={crumb.href} className="hover:text-red-600 transition">{crumb.label}</Link>
            {brandSlug && (
              <>
                <span>›</span>
                <Link href={`/marke/${brandSlug}`} className="hover:text-red-600 transition">{product.brand}</Link>
              </>
            )}
            <span>›</span>
            <span className="text-black font-medium truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Top section: 3 columns when there are specs, 2 otherwise */}
          <div className={`grid grid-cols-1 gap-8 mb-10 ${hasSpecs ? "md:grid-cols-2 lg:grid-cols-[1fr_1fr_280px]" : "md:grid-cols-2"}`}>

            {/* Images */}
            <ImageGallery images={product.images} name={product.name} sku={product.sku} />

            {/* Buy */}
            <div>
              <p className="text-sm text-gray-400 mb-1">{[product.brand, product.sku].filter(Boolean).join(" · ")}</p>
              <h1 className="text-2xl font-black text-black mb-4 leading-snug">{product.name}</h1>

              <div className="mb-5">
                <Price amount={product.price} original={product.originalPrice}
                  className="text-3xl font-bold text-black" strikeClassName="text-lg text-gray-400 line-through" />
              </div>

              <div className="flex items-center gap-2 mb-5">
                {product.in_stock ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                    <span className="text-sm text-green-700 font-medium">I lager</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    <span className="text-sm text-red-600 font-medium">Slut i lager</span>
                  </>
                )}
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

              <div className="border-t border-gray-200 mt-6 pt-5 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Artikelnummer</span>
                  <span className="font-medium text-black">{product.sku || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Varumärke</span>
                  <span className="font-medium text-black">{product.brand || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frakt</span>
                  <span className="font-medium text-black">Beräknas i kassan</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Garanti</span>
                  <span className="font-medium text-black">12 månader</span>
                </div>
              </div>
            </div>

            {/* Specs panel */}
            {hasSpecs && (
              <div className="md:col-span-2 lg:col-span-1">
                <SpecsPanel specs={specs} sku={product.sku} altNumbers={altNumbers} usedIn={usedIn} skuToProduct={skuToProduct} />
              </div>
            )}
          </div>

          {/* Beskrivning */}
          {(hasSpecs || remark || specs.features?.length) ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

              <div className="border-b border-gray-200 flex">
                <span className="px-6 py-3 text-sm font-semibold text-black border-b-2 border-black -mb-px">Beskrivning</span>
              </div>

              <div className="px-4 py-5 md:px-6 md:py-8">

                <h2 className="text-xl font-bold text-black mb-4 leading-snug">
                  {product.sku}
                  {oemNumbers.length > 0 && (
                    <span className="font-normal text-gray-600"> ({oemNumbers.map(n => n.number).join(", ")})</span>
                  )}
                  {" - "}{product.name}
                </h2>

                <table className="mb-8 text-sm w-full max-w-lg">
                  <tbody>
                    {product.brand && (
                      <tr>
                        <td className="text-gray-500 py-1 pr-8 w-48">Varumärke:</td>
                        <td className="text-black font-medium">{product.brand}</td>
                      </tr>
                    )}
                    {specs.model && (
                      <tr>
                        <td className="text-gray-500 py-1 pr-8">Modell:</td>
                        <td className="text-black font-medium">{specs.model}</td>
                      </tr>
                    )}
                    {specs.series && (
                      <tr>
                        <td className="text-gray-500 py-1 pr-8">Serie:</td>
                        <td className="text-black font-medium">{specs.series}</td>
                      </tr>
                    )}
                    {specs.technology && (
                      <tr>
                        <td className="text-gray-500 py-1 pr-8">Teknologi:</td>
                        <td className="text-black font-medium">{specs.technology}</td>
                      </tr>
                    )}
                    {specs.actuation && (
                      <tr>
                        <td className="text-gray-500 py-1 pr-8">Aktivering:</td>
                        <td className="text-black font-medium">{specs.actuation}</td>
                      </tr>
                    )}
                    {specs.reference && (
                      <tr>
                        <td className="text-gray-500 py-1 pr-8">{product.brand} referens:</td>
                        <td className="text-black font-medium">{specs.reference}</td>
                      </tr>
                    )}
                    {oemNumbers.length > 0 && (
                      <tr>
                        <td className="text-gray-500 py-1 pr-8 align-top">OEM-nummer:</td>
                        <td className="text-black font-medium">{oemNumbers.map(n => n.number).join(", ")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {remark && (
                  <p className="mb-8 text-sm text-gray-700 leading-relaxed whitespace-pre-line max-w-3xl">{remark}</p>
                )}

                {!!specs.features?.length && (
                  <ul className="mb-8 space-y-2">
                    {specs.features.map((f, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {altNumbers.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-black mb-3">
                      {product.sku} - Alternativa nummer
                    </h3>
                    {altNumbers.map((n, i) => (
                      <p key={i} className="text-sm text-gray-700 mb-0.5">
                        {n.label && <span className="text-gray-500">{n.label}: </span>}
                        <span className="font-medium">{n.value}</span>
                      </p>
                    ))}
                  </div>
                )}

                {usedIn.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-black mb-3">
                      {product.sku} - Passar turboladdare
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0.5">
                      {usedIn.map((r, i) => (
                        <p key={i} className="text-sm">
                          <ProductLink text={r} skuToProduct={skuToProduct} />
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {!!specs.turbo_parts?.length && (
                  <div>
                    <h3 className="text-lg font-bold text-black mb-4">
                      Turbo {product.sku} - Kompatibla delar
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-3 md:px-4 py-3 font-semibold text-gray-700 border border-gray-200 text-xs uppercase tracking-wide">Varumärke</th>
                            <th className="text-left px-3 md:px-4 py-3 font-semibold text-gray-700 border border-gray-200 text-xs uppercase tracking-wide">Benämning</th>
                            <th className="text-left px-3 md:px-4 py-3 font-semibold text-gray-700 border border-gray-200 text-xs uppercase tracking-wide">Artikelnummer</th>
                            <th className="text-center px-3 md:px-4 py-3 font-semibold text-gray-700 border border-gray-200 text-xs uppercase tracking-wide">Ant.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {specs.turbo_parts.map((p, i) => {
                            const pMatch = skuToProduct[p.sku.toUpperCase()];
                            return (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-3 md:px-4 py-2.5 border border-gray-200 text-gray-700">{pMatch?.brand ?? "TurboCentras"}</td>
                                <td className="px-3 md:px-4 py-2.5 border border-gray-200 text-gray-700">{partLabel(p)}</td>
                                <td className="px-3 md:px-4 py-2.5 border border-gray-200 font-mono">
                                  {pMatch ? (
                                    <Link href={`/produkt/${pMatch.id}`} className="text-red-600 hover:underline font-semibold">{p.sku}</Link>
                                  ) : (
                                    <span className="text-red-600 font-semibold">{p.sku}</span>
                                  )}
                                </td>
                                <td className="px-3 md:px-4 py-2.5 border border-gray-200 text-center text-gray-600">1</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

        </div>
      </main>
      <Footer />
    </>
  );
}
