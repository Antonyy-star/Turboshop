import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AddToCartButton from "@/components/AddToCartButton";
import Price from "@/components/Price";
import CatalogThumbs from "@/components/catalog/CatalogThumbs";
import CatalogBuyButton from "@/components/catalog/CatalogBuyButton";
import { InfoBox, InfoRow } from "@/components/catalog/InfoBox";
import { EyeIcon, QuickViewFrameBridge, QuickViewLink, QuickViewProvider } from "@/components/catalog/QuickView";
import { createServiceClient } from "@/lib/supabase/server";
import type { CatalogNumber, CatalogTurboPart } from "@/lib/catalog/search";

type Turbo = {
  id: number; brand: string | null; series: string | null; model: string | null; reference: string | null;
  numbers: CatalogNumber[]; parts: CatalogTurboPart[]; product_id: string | null;
};
type Product = { id: string; name: string; brand: string | null; sku: string | null; price: number; in_stock: boolean | null; images: string[] | null; original_price: number | null };

// Order of the parts table, like turbocentras.com: main parts first.
const PART_ORDER = [
  "Cartridge", "Nozzle ring assembly", "Repair kit", "Actuator", "Turbine housing", "Compressor housing",
  "Bearing housing", "Shaft and wheel", "Compressor wheel", "Heat shield", "Compressor plate", "Gasket kit",
];
const order = (t: string) => { const i = PART_ORDER.indexOf(t); return i < 0 ? PART_ORDER.length : i; };

async function loadTurbo(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const supabase = createServiceClient();
  const { data } = await supabase.from("catalog_turbos")
    .select("id, brand, series, model, reference, numbers, parts, product_id").eq("id", Number(id)).maybeSingle();
  return data as Turbo | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const turbo = await loadTurbo((await params).id);
  if (!turbo) return { title: "Turboladdare" };
  const name = [turbo.brand, turbo.series, turbo.reference].filter(Boolean).join(" ");
  return {
    title: `Turboladdare ${name}`,
    description: `Delar till turboladdare ${name}${turbo.model ? ` (${turbo.model})` : ""}: patron, reparationssats, munstycksring, hus, ställdon och fler.`,
  };
}

// Catalog view of a turbocharger, like turbocentras.com/catalog/turbochargers/<ref>.
// ?vy=snabb shows it as a quick view (no header or footer).
export default async function CatalogTurboPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vy?: string }>;
}) {
  const { id } = await params;
  const quick = (await searchParams).vy === "snabb";
  const turbo = await loadTurbo(id);
  if (!turbo) notFound();

  const supabase = createServiceClient();
  const productIds = [...new Set([turbo.product_id, ...turbo.parts.map(p => p.pid)].filter((x): x is string => !!x))];
  const products = new Map<string, Product>();
  for (let i = 0; i < productIds.length; i += 200) {
    const { data } = await supabase.from("products")
      .select("id, name, brand, sku, price, in_stock, images, original_price").in("id", productIds.slice(i, i + 200));
    for (const p of (data ?? []) as Product[]) products.set(String(p.id), p);
  }

  const parts = [...turbo.parts].sort((a, b) => order(a.type) - order(b.type) || a.type.localeCompare(b.type) || a.ref.localeCompare(b.ref));
  const own = turbo.product_id ? products.get(turbo.product_id) ?? null : null;
  const ref = turbo.reference ?? String(turbo.id);
  const th = "text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600 border-b border-gray-200";
  const td = "px-3 py-2 border-b border-gray-100";

  return (
    <QuickViewProvider>
      {!quick && <Header />}
      <main style={{ background: "#f5f5f5", minHeight: quick ? undefined : "100vh", color: "#111" }}>
        {!quick && (
          <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 0" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", display: "flex", gap: 6, fontSize: 12, color: "#666", flexWrap: "wrap" }}>
              <Link href="/" style={{ color: "#0891b2", textDecoration: "none" }}>Hem</Link>
              <span>›</span>
              <Link href="/katalog" style={{ color: "#0891b2", textDecoration: "none" }}>Katalog</Link>
              <span>›</span>
              <span style={{ color: "#111", fontWeight: 600, textTransform: "uppercase" }}>{ref}</span>
            </div>
          </div>
        )}

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: quick ? "12px 12px 16px" : "16px 20px 48px", display: "flex", flexDirection: "column", gap: 4 }}>
          {!quick && (
            <h1 style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" }}>
              Turbocharger {ref}
            </h1>
          )}

          {/* TURBO PARTS */}
          <InfoBox title={`${ref} Turbo Parts`}>
            {parts.length === 0 ? (
              <span style={{ color: "#888", fontSize: 12 }}>No turbo parts available for {ref}</span>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto -mx-3 -my-2.5">
                  <table className="w-full text-[13px] border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={th}>Part name</th><th className={th}>Brand</th><th className={th}>Reference</th>
                        <th className={th}>Price</th><th className={th}>Stock</th><th className={th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map((p, i) => {
                        const prod = p.pid ? products.get(p.pid) : undefined;
                        return (
                          <tr key={`${p.ref}-${i}`} className="hover:bg-gray-50">
                            <td className={td}>{p.type}</td>
                            <td className={`${td} text-gray-600`}>{prod?.brand ?? "TurboCentras"}</td>
                            <td className={td}>
                              <PartRef part={p} quick={quick} />
                            </td>
                            <td className={`${td} whitespace-nowrap`}>{prod ? <Price amount={prod.price} className="font-semibold" strikeClassName="text-xs text-gray-400 line-through" showBadge={false} /> : "—"}</td>
                            <td className={`${td} whitespace-nowrap`}>
                              {prod ? (
                                <span className={prod.in_stock !== false ? "text-green-700" : "text-red-600"}>
                                  {prod.in_stock !== false ? "I lager" : "Slut"}
                                </span>
                              ) : <span className="text-gray-400">Ej i sortimentet</span>}
                            </td>
                            <td className={td}>
                              {prod && prod.in_stock !== false ? (
                                <CatalogBuyButton product={{ id: String(prod.id), name: prod.name, brand: prod.brand ?? "", sku: prod.sku ?? p.ref, price: prod.price, image: prod.images?.[0] ?? "" }} />
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Phones: one row per part */}
                <ul className="md:hidden -mx-3 -my-2.5 divide-y divide-gray-100">
                  {parts.map((p, i) => {
                    const prod = p.pid ? products.get(p.pid) : undefined;
                    return (
                      <li key={`${p.ref}-${i}`} className="px-3 py-3 text-[13px]">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-gray-600">{p.type}</span>
                          <PartRef part={p} quick={quick} />
                        </div>
                        <div className="flex items-center justify-between gap-3 mt-2">
                          <span>
                            {prod ? <Price amount={prod.price} className="font-semibold" strikeClassName="text-xs text-gray-400 line-through" showBadge={false} /> : <span className="font-semibold">—</span>}{" "}
                            {prod ? (
                              <span className={prod.in_stock !== false ? "text-green-700" : "text-red-600"}>
                                · {prod.in_stock !== false ? "I lager" : "Slut"}
                              </span>
                            ) : <span className="text-gray-400">· Ej i sortimentet</span>}
                          </span>
                          {prod && prod.in_stock !== false && (
                            <CatalogBuyButton product={{ id: String(prod.id), name: prod.name, brand: prod.brand ?? "", sku: prod.sku ?? p.ref, price: prod.price, image: prod.images?.[0] ?? "" }} />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </InfoBox>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 4 }}>
            <InfoBox title={`${ref} Main Info`}>
              <InfoRow label="Turbo brand" value={turbo.brand ?? "—"} />
              <InfoRow label="Reference" value={ref} />
              {turbo.series && <InfoRow label="Series" value={turbo.series} />}
              {turbo.model && <InfoRow label="Model" value={turbo.model} />}
            </InfoBox>

            <InfoBox title={`${ref} Alternative Numbers`}>
              {turbo.numbers.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {turbo.numbers.map((n, i) => (
                    <div key={i} style={{ fontSize: 12 }}>
                      <span style={{ color: "#666" }}>{n.t}: </span><span style={{ fontWeight: 500 }}>{n.n}</span>
                    </div>
                  ))}
                </div>
              ) : <span style={{ color: "#888", fontSize: 12 }}>No alternative numbers available</span>}
            </InfoBox>

            <InfoBox title={own ? `Shopping — ${own.sku ?? ref}` : "Shopping"}>
              {own ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12 }}><span style={{ color: "#666" }}>Reference: </span><span style={{ fontWeight: 600 }}>{own.sku}</span></div>
                  <div style={{ fontSize: 12 }}><span style={{ color: "#666" }}>Price: </span><Price amount={own.price} original={own.original_price} className="font-bold text-[15px]" strikeClassName="text-xs text-gray-400 line-through" /></div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: own.in_stock !== false ? "#16a34a" : "#dc2626" }}>
                    {own.in_stock !== false ? "In stock" : "Out of stock"}
                  </div>
                  <AddToCartButton product={{ id: String(own.id), name: own.name, brand: own.brand ?? "", sku: own.sku ?? ref, price: own.price, image: own.images?.[0] ?? "" }} />
                </div>
              ) : <span style={{ color: "#888", fontSize: 12 }}>This turbocharger is not sold as a complete unit. The parts above can be ordered.</span>}
            </InfoBox>

            <InfoBox title={`${ref} Turbo Images`}>
              <CatalogThumbs images={own?.images ?? []} sku={ref} />
            </InfoBox>
          </div>
        </div>
      </main>
      {!quick && <Footer />}
      {quick && <QuickViewFrameBridge />}
    </QuickViewProvider>
  );
}

function PartRef({ part, quick }: { part: CatalogTurboPart; quick: boolean }) {
  const cls = "inline-flex items-center gap-1.5 font-mono text-[#0891b2] hover:text-red-600";
  if (!part.pid) return <span className="font-mono text-gray-700">{part.ref}</span>;
  // Inside a quick view, open the part page itself instead of a window in a window.
  if (quick) {
    return (
      <a href={`/katalog/produkt/${part.pid}`} target="_top" className={cls}>
        <EyeIcon />{part.ref}
      </a>
    );
  }
  return (
    <QuickViewLink href={`/katalog/produkt/${part.pid}`} title={`${part.type} ${part.ref}`} className={cls}>
      <EyeIcon />{part.ref}
    </QuickViewLink>
  );
}
