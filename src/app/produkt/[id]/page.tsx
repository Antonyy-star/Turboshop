import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/ImageGallery";
import Link from "next/link";
import { getProductById } from "@/lib/realProducts";
import { getRealProductById } from "@/lib/parseProducts";
import { createClient } from "@/lib/supabase/server";
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

function SpecsPanel({ specs, sku }: { specs: Specs; sku: string }) {
  const header = [specs.series, sku].filter(Boolean).join(" · ");
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-fit sticky top-24">
      {/* Header bar */}
      {header && (
        <div className="bg-gray-900 text-white px-4 py-3">
          <p className="text-xs font-bold tracking-wide">{header}</p>
        </div>
      )}

      <div className="px-4 py-4 max-h-[80vh] overflow-y-auto">
        {/* Basic info */}
        {specs.series     && <SpecRow label="Series"     value={specs.series} />}
        {specs.model      && <SpecRow label="Model"      value={specs.model} />}
        {specs.technology && <SpecRow label="Technology" value={specs.technology} />}
        {specs.actuation  && <SpecRow label="Actuation"  value={specs.actuation} />}
        {specs.reference  && <SpecRow label="Reference"  value={specs.reference} />}

        {/* Turbo Numbers */}
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

        {/* Turbo Replacements */}
        {!!specs.replacements?.length && (
          <>
            <SectionTitle>Turbo Replacements</SectionTitle>
            <div className="space-y-1">
              {specs.replacements.map((r, i) => (
                <p key={i} className="text-[11px] text-gray-700 leading-snug">
                  <span className="text-gray-400">Replacement for: </span>
                  {r}
                </p>
              ))}
            </div>
          </>
        )}

        {/* Interchangeable With */}
        {!!specs.interchangeable_with?.length && (
          <>
            <SectionTitle>Interchangeable With</SectionTitle>
            <div className="space-y-1">
              {specs.interchangeable_with.map((r, i) => (
                <p key={i} className="text-[11px] text-gray-700 leading-snug">{r}</p>
              ))}
            </div>
          </>
        )}

        {/* Turbo Parts */}
        {!!specs.turbo_parts?.length && (
          <>
            <SectionTitle>Turbo Parts</SectionTitle>
            <div className="space-y-1.5">
              {specs.turbo_parts.map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-[11px] text-gray-500">{p.type}</span>
                  <span className="text-[11px] font-mono font-semibold text-red-600">{p.sku}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
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
  const hasSpecs = specs && (
    specs.series || specs.model || specs.turbo_numbers?.length ||
    specs.replacements?.length || specs.interchangeable_with?.length || specs.turbo_parts?.length
  );

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-red-600 transition">Hem</Link>
            <span>›</span>
            <Link href="/kategori/turboladdare" className="hover:text-red-600 transition">Turboladdare</Link>
            <span>›</span>
            <Link href={`/marke/${product.brand.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-red-600 transition">{product.brand}</Link>
            <span>›</span>
            <span className="text-black font-medium">{product.name}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className={`grid grid-cols-1 gap-8 ${hasSpecs ? "md:grid-cols-[1fr_1fr_280px]" : "md:grid-cols-2"}`}>

            {/* Col 1 — image gallery */}
            <ImageGallery images={product.images} name={product.name} />

            {/* Col 2 — product info */}
            <div>
              <p className="text-sm text-gray-400 mb-1">{product.brand} · {product.sku}</p>
              <h1 className="text-2xl font-black text-black mb-4">{product.name}</h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-bold text-black">{product.price.toLocaleString("sv-SE")} kr</span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-400 line-through">{product.originalPrice.toLocaleString("sv-SE")} kr</span>
                )}
              </div>

              {/* Stock */}
              <div className="flex items-center gap-2 mb-6">
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

              {/* Add to cart */}
              <div className="flex gap-3 mb-6">
                <input type="number" defaultValue={1} min={1}
                  className="w-16 border border-gray-300 rounded-md px-3 py-3 text-sm text-center focus:outline-none focus:border-red-500" />
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md transition text-sm">
                  Lägg i varukorg
                </button>
              </div>

              <button className="w-full border border-gray-300 hover:border-red-400 text-gray-700 hover:text-red-600 font-medium py-3 rounded-md transition text-sm mb-8">
                ♡ Lägg till i önskelista
              </button>

              {/* Basic details */}
              <div className="border-t border-gray-200 pt-6 space-y-3">
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

              {product.description && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="font-bold text-sm uppercase tracking-wide text-black mb-2">Beskrivning</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
                </div>
              )}
            </div>

            {/* Col 3 — specs panel (only when data exists) */}
            {hasSpecs && <SpecsPanel specs={specs!} sku={product.sku} />}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
