import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function CartPage() {
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
          <p className="text-gray-500 mb-8">Du har inga produkter i varukorgen än. Fortsätt handla för att hitta din turbo.</p>
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
