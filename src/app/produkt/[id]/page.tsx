import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/ImageGallery";
import Link from "next/link";
import { getProductById } from "@/lib/realProducts";
import { getRealProductById } from "@/lib/parseProducts";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Check DB first, then fall back to hardcoded data
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left — image gallery */}
            <ImageGallery images={product.images} name={product.name} />

            {/* Right — product info */}
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
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                    <span className="text-sm text-green-700 font-medium">I lager — skickas inom 1–2 arbetsdagar</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
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

              {/* Details */}
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
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
