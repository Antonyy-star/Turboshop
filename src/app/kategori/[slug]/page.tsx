import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import ProductImage from "@/components/ProductImage";
import CategoryFilters from "@/components/CategoryFilters";
import CategorySort from "@/components/CategorySort";
import type { Metadata } from "next";
import { Suspense } from "react";

export const revalidate = 120;

const categoryNames: Record<string, string> = {
  turboladdare: "Turboladdare",
  chra: "Patroner (CHRA)",
  turbodelar: "Turbodelar",
  kompressorhjul: "Kompressorhjul",
  packningar: "Packningar & tätningar",
  prestanda: "Prestandadelar",
  utrustning: "Reparationsutrustning",
  tuning: "Tuning",
};

const slugToDbCategory: Record<string, string> = {
  turboladdare: "Turboladdare",
  chra: "CHRA",
  turbodelar: "Turbodelar",
  kompressorhjul: "Kompressorhjul",
  packningar: "Packningar & Tätningar",
  reparationskit: "Reparationskit",
  utrustning: "Utrustning",
  tuning: "Tuning",
};

const PRODUCTS_PER_PAGE = 40;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const name = categoryNames[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    title: name,
    description: `Köp ${name.toLowerCase()} online — OEM och eftermarknadsdelar med snabb leverans till hela Sverige.`,
    openGraph: { title: `${name} | TurboTeknik` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sida?: string; marke?: string; prisMin?: string; prisMax?: string; lager?: string; sortera?: string }>;
}) {
  const { slug } = await params;
  const { sida, marke, prisMin, prisMax, lager, sortera } = await searchParams;

  const categoryName = categoryNames[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  const dbCategory = slugToDbCategory[slug];

  const selectedBrands = marke ? marke.split(",").map((b) => b.trim()).filter(Boolean) : [];
  const prisMinNum = prisMin ? parseFloat(prisMin) : null;
  const prisMaxNum = prisMax ? parseFloat(prisMax) : null;
  const lagerOnly = lager === "1";

  const supabase = createServiceClient();

  // Fetch distinct brands for this category
  let brandsQuery = supabase.from("products").select("brand").not("brand", "is", null);
  if (dbCategory) {
    if (slug === "turboladdare") {
      brandsQuery = (brandsQuery as any).or(`category.eq.${dbCategory},category.is.null`);
    } else {
      brandsQuery = (brandsQuery as any).eq("category", dbCategory);
    }
  }
  const { data: brandsRaw } = await brandsQuery;
  const brands = [...new Set((brandsRaw ?? []).map((r: any) => r.brand).filter(Boolean))].sort() as string[];

  function applyFilters(q: any) {
    if (dbCategory) {
      if (slug === "turboladdare") {
        q = q.or(`category.eq.${dbCategory},category.is.null`);
      } else {
        q = q.eq("category", dbCategory);
      }
    }
    if (selectedBrands.length > 0) q = q.in("brand", selectedBrands);
    if (prisMinNum !== null) q = q.gte("price", prisMinNum);
    if (prisMaxNum !== null) q = q.lte("price", prisMaxNum);
    if (lagerOnly) q = q.eq("in_stock", true);
    return q;
  }

  function applySort(q: any) {
    if (sortera === "pris-asc") return q.order("price", { ascending: true });
    if (sortera === "pris-desc") return q.order("price", { ascending: false });
    if (sortera === "nyast") return q.order("created_at", { ascending: false });
    return q.order("price", { ascending: false });
  }

  const { count: totalCount } = await applyFilters(
    supabase.from("products").select("*", { count: "exact", head: true })
  );

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const currentPage = Math.max(1, Math.min(parseInt(sida ?? "1", 10), totalPages));
  const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;

  const { data: dbProducts } = await applySort(
    applyFilters(
      supabase.from("products").select("id,name,brand,sku,price,original_price,images,badge,in_stock,category")
    )
  ).range(from, to);

  const products = (dbProducts ?? []).map((p: any) => ({
    id: String(p.id),
    name: p.name,
    brand: p.brand,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    sku: p.sku ?? "",
    badge: p.badge ?? null,
    images: p.images ?? [],
    in_stock: p.in_stock !== false,
  }));

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pageNumbers.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2
  );

  const activeFilterCount = selectedBrands.length + (prisMinNum ? 1 : 0) + (prisMaxNum ? 1 : 0) + (lagerOnly ? 1 : 0);

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-red-600 transition">Hem</Link>
            <span>›</span>
            <span className="text-black font-medium">{categoryName}</span>
            {activeFilterCount > 0 && (
              <>
                <span>›</span>
                <span className="text-red-600 font-medium">{activeFilterCount} filter aktiva</span>
              </>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
          <Suspense fallback={<div className="hidden md:block w-56 flex-shrink-0" />}>
            <CategoryFilters
              slug={slug}
              brands={brands}
              selectedBrands={selectedBrands}
              prisMin={prisMin ?? ""}
              prisMax={prisMax ?? ""}
              lager={lagerOnly}
            />
          </Suspense>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {total === 0 ? (
                  "Inga produkter matchar filtret"
                ) : (
                  <>
                    Visar {from + 1}–{Math.min(from + PRODUCTS_PER_PAGE, total)} av{" "}
                    <strong>{total.toLocaleString("sv-SE")}</strong> produkter
                  </>
                )}
              </p>
              <Suspense fallback={null}>
                <CategorySort slug={slug} sortera={sortera ?? ""} />
              </Suspense>
            </div>

            {products.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                <p className="text-gray-400 text-lg mb-2">Inga produkter hittades</p>
                <Link href={`/kategori/${slug}`} className="text-red-600 text-sm hover:underline">
                  Rensa filter
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product: typeof products[number]) => (
                  <Link
                    key={product.id}
                    href={`/produkt/${product.id}`}
                    className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-red-300 transition"
                  >
                    <div className="bg-gray-100 h-40 flex items-center justify-center relative overflow-hidden">
                      <ProductImage src={product.images[0]} alt={product.name} />
                      {product.badge && (
                        <span className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded ${product.badge === "Rea" ? "bg-red-600" : "bg-green-600"}`}>
                          {product.badge}
                        </span>
                      )}
                      {product.in_stock ? (
                        <span className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">I lager</span>
                      ) : (
                        <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Slut</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-400 mb-1">{product.brand} · {product.sku}</p>
                      <h3 className="font-semibold text-sm text-black group-hover:text-red-600 transition leading-tight mb-2 line-clamp-2">{product.name}</h3>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-base font-bold text-black">{product.price.toLocaleString("sv-SE")} kr</span>
                        {product.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">{product.originalPrice.toLocaleString("sv-SE")} kr</span>
                        )}
                      </div>
                      <button className="w-full bg-black hover:bg-red-600 text-white text-xs font-medium py-2 rounded transition">Lägg i varukorg</button>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-10">
                {currentPage > 1 && (
                  <Link
                    href={`/kategori/${slug}?${new URLSearchParams({ ...(marke ? { marke } : {}), ...(prisMin ? { prisMin } : {}), ...(prisMax ? { prisMax } : {}), ...(lager ? { lager } : {}), ...(sortera ? { sortera } : {}), sida: String(currentPage - 1) }).toString()}`}
                    className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition"
                  >
                    ‹ Föregående
                  </Link>
                )}
                {visiblePages.map((p, idx) => {
                  const prev = visiblePages[idx - 1];
                  const href = `/kategori/${slug}?${new URLSearchParams({ ...(marke ? { marke } : {}), ...(prisMin ? { prisMin } : {}), ...(prisMax ? { prisMax } : {}), ...(lager ? { lager } : {}), ...(sortera ? { sortera } : {}), sida: String(p) }).toString()}`;
                  return (
                    <span key={p} className="flex items-center gap-1">
                      {prev && p - prev > 1 && <span className="px-2 text-gray-400">…</span>}
                      <Link
                        href={href}
                        className={`px-3 py-2 text-sm border rounded transition ${p === currentPage ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-300 hover:border-red-500 hover:text-red-600"}`}
                      >
                        {p}
                      </Link>
                    </span>
                  );
                })}
                {currentPage < totalPages && (
                  <Link
                    href={`/kategori/${slug}?${new URLSearchParams({ ...(marke ? { marke } : {}), ...(prisMin ? { prisMin } : {}), ...(prisMax ? { prisMax } : {}), ...(lager ? { lager } : {}), ...(sortera ? { sortera } : {}), sida: String(currentPage + 1) }).toString()}`}
                    className="px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:border-red-500 hover:text-red-600 transition"
                  >
                    Nästa ›
                  </Link>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <p className="text-center text-xs text-gray-400 mt-3">Sida {currentPage} av {totalPages}</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
