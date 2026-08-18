import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/ImageGallery";
import Link from "next/link";
import { getProductById } from "@/lib/realProducts";
import { getRealProductById } from "@/lib/parseProducts";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

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
};

function extractSku(text: string): string | null {
  const m = text.match(/\b([0-9]{4,}[0-9A-Z-]*[0-9A-Z])\b/i);
  return m ? m[1] : null;
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

function SpecsPanel({
  specs, sku, skuToProduct,
}: {
  specs: Specs;
  sku: string;
  skuToProduct: Record<string, { id: string; brand: string }>;
}) {
  const header = [specs.series, sku].filter(Boolean).join(" · ");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-fit sticky top-24">
      {header && (
        <div className="bg-gray-900 text-white px-4 py-3">
          <p className="text-xs font-bold tracking-wide">{header}</p>
        </div>
      )}
      <div className="px-4 py-4 max-h-[80vh] overflow-y-auto">
        {specs.series     && <SpecRow label="Series"     value={specs.series} />}
        {specs.model      && <SpecRow label="Model"      value={specs.model} />}
        {specs.technology && <SpecRow label="Technology" value={specs.technology} />}
        {specs.actuation  && <SpecRow label="Actuation"  value={specs.actuation} />}
        {specs.reference  && <SpecRow label="Reference"  value={specs.reference} />}

        {!!specs.turbo_numbers?.length && (
          <>
            <SectionTitle>Turbo Numbers</SectionTitle>
            <div className="space-y-1">
              {specs.turbo_numbers.map((n, i) => (
                <div key={i} className="flex justify-between items-start">
                  <span className="text-[11px] text-gray-400 shrink-0 mr-2">{n.type}</span>
                  <span className="text-[11px] font-mono font-medium text-black text-right">{n.number}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!!specs.replacements?.length && (
          <>
            <SectionTitle>Turbo Replacements</SectionTitle>
            <div className="space-y-1">
              {specs.replacements.map((r, i) => {
                const rSku = extractSku(r);
                const rMatch = rSku ? skuToProduct[rSku.toUpperCase()] : null;
                return (
                  <p key={i} className="text-[11px] text-gray-700 leading-snug">
                    <span className="text-gray-400">Replacement for: </span>
                    {rMatch ? (
                      <Link href={`/produkt/${rMatch.id}`} className="text-red-600 hover:underline font-medium">{r}</Link>
                    ) : r}
                  </p>
                );
              })}
            </div>
          </>
        )}

        {!!specs.interchangeable_with?.length && (
          <>
            <SectionTitle>Interchangeable With</SectionTitle>
            <div className="space-y-1">
              {specs.interchangeable_with.map((r, i) => {
                const iSku = extractSku(r);
                const iMatch = iSku ? skuToProduct[iSku.toUpperCase()] : null;
                return (
                  <p key={i} className="text-[11px] leading-snug">
                    {iMatch ? (
                      <Link href={`/produkt/${iMatch.id}`} className="text-red-600 hover:underline font-medium">{r}</Link>
                    ) : (
                      <span className="text-gray-700">{r}</span>
                    )}
                  </p>
                );
              })}
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
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500">
                      {p.type.replace(p.sku, "").replace(/\s*:\s*$/, "").trim() || p.type}
                    </span>
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

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createServiceClient();
  const { data: dbProduct } = await supabase.from("products").select("*").eq("id", id).single();

  const product = dbProduct
    ? {
        id: dbProduct.id,
        name: dbProduct.name,
        brand: dbProduct.brand,
        price: dbProduct.price,
        originalPrice: dbProduct.original_price ?? null,
        sku: dbProduct.sku ?? "",
        images: dbProduct.images ?? [],
        badge: dbProduct.badge ?? null,
        description: dbProduct.description ?? "",
        in_stock: dbProduct.in_stock !== false,
      }
    : { ...(getRealProductById(id) ?? getProductById(id)), in_stock: true };

  if (!product) notFound();

  const specs: Specs | null = dbProduct?.specs ?? null;
  const hasSpecs = !!(specs && (
    specs.series || specs.model || specs.turbo_numbers?.length ||
    specs.replacements?.length || specs.interchangeable_with?.length ||
    specs.turbo_parts?.length
  ));

  // Collect all SKUs referenced in specs
  let skuToProduct: Record<string, { id: string; brand: string }> = {};
  if (hasSpecs && specs) {
    const referencedSkus: string[] = [];
    specs.replacements?.forEach(r => { const s = extractSku(r); if (s) referencedSkus.push(s); });
    specs.interchangeable_with?.forEach(r => { const s = extractSku(r); if (s) referencedSkus.push(s); });
    specs.turbo_parts?.forEach(p => referencedSkus.push(p.sku));

    if (referencedSkus.length > 0) {
      const uniqueSkus = [...new Set(referencedSkus)];

      const { data: exactMatched } = await supabase
        .from("products").select("id, sku, brand").in("sku", uniqueSkus);
      if (exactMatched) {
        exactMatched.forEach((p: any) => {
          skuToProduct[p.sku.toUpperCase()] = { id: String(p.id), brand: p.brand };
        });
      }

      const unmatched = uniqueSkus.filter(s => !skuToProduct[s.toUpperCase()]);
      if (unmatched.length > 0) {
        const orFilter = unmatched.map(s => `sku.ilike.${s}%`).join(",");
        const { data: prefixMatched } = await supabase
          .from("products").select("id, sku, brand").or(orFilter);
        if (prefixMatched) {
          prefixMatched.forEach((p: any) => {
            unmatched.forEach(s => {
              if (p.sku.toUpperCase().startsWith(s.toUpperCase()) && !skuToProduct[s.toUpperCase()]) {
                skuToProduct[s.toUpperCase()] = { id: String(p.id), brand: p.brand };
              }
            });
          });
        }
      }
    }
  }

  const oemNumbers = specs?.turbo_numbers?.filter(n =>
    n.type.toUpperCase().includes("OEM") || n.type.toUpperCase().includes("REF")
  ) ?? [];

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">

        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-red-600 transition">Hem</Link>
            <span>›</span>
            {dbProduct?.category === "CHRA" ? (
              <Link href="/kategori/chra" className="hover:text-red-600 transition">CHRA</Link>
            ) : dbProduct?.category === "Turbodelar" ? (
              <Link href="/kategori/turbodelar" className="hover:text-red-600 transition">Turbodelar</Link>
            ) : (
              <Link href="/kategori/turboladdare" className="hover:text-red-600 transition">Turboladdare</Link>
            )}
            <span>›</span>
            <Link href={`/marke/${product.brand.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-red-600 transition">{product.brand}</Link>
            <span>›</span>
            <span className="text-black font-medium truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Top section: 3-col when specs, 2-col otherwise */}
          <div className={`grid grid-cols-1 gap-8 mb-10 ${hasSpecs ? "lg:grid-cols-[1fr_1fr_280px]" : "md:grid-cols-2"}`}>

            {/* Col 1 — image gallery */}
            <ImageGallery images={product.images} name={product.name} />

            {/* Col 2 — buy section */}
            <div>
              <p className="text-sm text-gray-400 mb-1">{product.brand} · {product.sku}</p>
              <h1 className="text-2xl font-black text-black mb-4 leading-snug">{product.name}</h1>

              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-3xl font-bold text-black">{product.price.toLocaleString("sv-SE")} kr</span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-400 line-through">{product.originalPrice.toLocaleString("sv-SE")} kr</span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-5">
                {product.in_stock ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                    <span className="text-sm text-green-700 font-medium">I lager — skickas inom 1–2 arbetsdagar</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    <span className="text-sm text-red-600 font-medium">Slut i lager</span>
                  </>
                )}
              </div>

              <div className="flex gap-3 mb-4">
                <input type="number" defaultValue={1} min={1}
                  className="w-16 border border-gray-300 rounded-md px-3 py-3 text-sm text-center focus:outline-none focus:border-red-500" />
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md transition text-sm">
                  Lägg i varukorg
                </button>
              </div>

              <button className="w-full border border-gray-300 hover:border-red-400 text-gray-700 hover:text-red-600 font-medium py-3 rounded-md transition text-sm mb-6">
                ♡ Lägg till i önskelista
              </button>

              <div className="border-t border-gray-200 pt-5 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Artikelnummer</span>
                  <span className="font-medium text-black">{product.sku}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Varumärke</span>
                  <span className="font-medium text-black">{product.brand}</span>
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

            {/* Col 3 — specs panel on the right */}
            {hasSpecs && (
              <SpecsPanel specs={specs!} sku={product.sku} skuToProduct={skuToProduct} />
            )}
          </div>

          {/* Beskrivning section — full width below, turbocentras style */}
          {hasSpecs && specs && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

              <div className="border-b border-gray-200 flex">
                <span className="px-6 py-3 text-sm font-semibold text-black border-b-2 border-black -mb-px">Beskrivning</span>
              </div>

              <div className="px-6 py-8">

                {/* Heading: SKU (OEM numbers) - Product name */}
                <h2 className="text-xl font-bold text-black mb-4 leading-snug">
                  {product.sku}
                  {oemNumbers.length > 0 && (
                    <span className="font-normal text-gray-600"> ({oemNumbers.map(n => n.number).join(", ")})</span>
                  )}
                  {" - "}{product.name}
                </h2>

                {/* Meta table */}
                <table className="mb-8 text-sm w-full max-w-lg">
                  <tbody>
                    <tr>
                      <td className="text-gray-500 py-1 pr-8 w-48">Varumärke:</td>
                      <td className="text-black font-medium">{product.brand}</td>
                    </tr>
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

                {/* Alternative numbers */}
                {!!specs.turbo_numbers?.length && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-black mb-3">
                      {product.sku} - Alternativa nummer
                    </h3>
                    {specs.turbo_numbers.map((n, i) => (
                      <p key={i} className="text-sm text-gray-700 mb-0.5">
                        <span className="text-gray-500">{n.type}:</span>{" "}
                        <span className="font-medium">{n.number}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Compatible parts table */}
                {!!specs.turbo_parts?.length && (
                  <div>
                    <h3 className="text-lg font-bold text-black mb-4">
                      Turbo {product.sku} - Kompatibla delar
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-4 py-3 font-semibold text-gray-700 border border-gray-200 text-xs uppercase tracking-wide">Varumärke</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700 border border-gray-200 text-xs uppercase tracking-wide">Benämning</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700 border border-gray-200 text-xs uppercase tracking-wide">Artikelnummer</th>
                            <th className="text-center px-4 py-3 font-semibold text-gray-700 border border-gray-200 text-xs uppercase tracking-wide">Ant.</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-700 border border-gray-200 text-xs uppercase tracking-wide">OE-nummer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {specs.turbo_parts.map((p, i) => {
                            const pMatch = skuToProduct[p.sku.toUpperCase()];
                            const partBrand = pMatch?.brand ?? "TurboCentras";
                            return (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-4 py-2.5 border border-gray-200 text-gray-700">{partBrand}</td>
                                <td className="px-4 py-2.5 border border-gray-200 text-gray-700">
                                  {p.type.replace(p.sku, "").replace(/\s*:\s*$/, "").trim() || p.type}
                                </td>
                                <td className="px-4 py-2.5 border border-gray-200 font-mono">
                                  {pMatch ? (
                                    <Link href={`/produkt/${pMatch.id}`} className="text-red-600 hover:underline font-semibold">{p.sku}</Link>
                                  ) : (
                                    <span className="text-red-600 font-semibold">{p.sku}</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 border border-gray-200 text-center text-gray-600">1</td>
                                <td className="px-4 py-2.5 border border-gray-200 text-gray-400">–</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {oemNumbers.length > 0 && (
                      <p className="text-xs text-gray-500 mt-4">
                        {oemNumbers.map(n => n.number).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Description text */}
                {product.description && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-black mb-2">Mer information</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* No specs: show description only if present */}
          {!hasSpecs && product.description && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-sm uppercase tracking-wide text-black mb-2">Beskrivning</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
