"use client";

import { useCart } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Trash2 } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQty, total, count } = useCart();

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="bg-gray-50 min-h-screen">
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-red-600 transition">Hem</Link>
              <span>›</span>
              <span className="text-black font-medium">Varukorg</span>
            </div>
          </div>
          <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <div className="text-6xl mb-6">🛒</div>
            <h1 className="text-2xl font-bold text-black mb-3">Din varukorg är tom</h1>
            <p className="text-gray-500 mb-8">
              Du har inga produkter i varukorgen än. Fortsätt handla för att hitta din turbo.
            </p>
            <Link
              href="/kategori/turboladdare"
              className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-md transition"
            >
              Handla turbos
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-red-600 transition">Hem</Link>
            <span>›</span>
            <span className="text-black font-medium">Varukorg ({count} st)</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-black mb-6">Din varukorg</h1>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Items list */}
            <div className="flex-1 space-y-3">
              {items.map(item => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 flex gap-3 items-start">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/produkt/${item.id}`}
                      className="text-sm font-semibold text-black hover:text-red-600 transition leading-snug block"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{item.brand} · {item.sku}</p>
                    <p className="text-sm md:text-base font-bold text-black mt-1">
                      {(item.price * item.quantity).toLocaleString("sv-SE")} kr
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-400">{item.price.toLocaleString("sv-SE")} kr/st</p>
                    )}
                    {/* Qty controls inline on mobile for better space usage */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:border-red-400 hover:text-red-600 transition text-sm font-bold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:border-red-400 hover:text-red-600 transition text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-300 hover:text-red-500 transition flex-shrink-0 mt-1"
                    title="Ta bort"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="lg:w-72 flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-24">
                <h2 className="font-bold text-base text-black mb-4">Ordersummering</h2>

                <div className="space-y-2.5 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Produkter ({count} st)</span>
                    <span className="text-black font-medium">{total.toLocaleString("sv-SE")} kr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Frakt</span>
                    <span className="text-gray-400">Beräknas i kassan</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3.5 mb-5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-black">Totalt</span>
                    <span className="font-bold text-black text-xl">{total.toLocaleString("sv-SE")} kr</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Inkl. moms · Exkl. frakt</p>
                </div>

                <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-lg transition text-sm mb-3">
                  Gå till kassan →
                </button>
                <Link
                  href="/kategori/turboladdare"
                  className="block w-full text-center text-sm text-gray-500 hover:text-red-600 transition py-2"
                >
                  Fortsätt handla
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
