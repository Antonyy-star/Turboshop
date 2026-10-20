import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { requireCustomerPage } from "@/lib/auth/session";
import { customerProfile } from "@/lib/auth/profile";
import { discountPercentOf } from "@/lib/pricing";
import { stripeEnabled } from "@/lib/stripe";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = {
  title: "Kassa",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ avbruten?: string }> }) {
  const user = await requireCustomerPage("/kassa");
  const { avbruten } = await searchParams;
  const profile = customerProfile(user);

  return (
    <>
      <Header />
      <main className="bg-gray-50 flex-1">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-red-600 transition">Hem</Link>
            <span>›</span>
            <Link href="/cart" className="hover:text-red-600 transition">Varukorg</Link>
            <span>›</span>
            <span className="text-black font-medium">Kassa</span>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-black text-black mb-6">Kassa</h1>
          {avbruten && (
            <p role="status" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Kortbetalningen avbröts, så ingen betalning har gjorts. Varorna finns kvar nedan. Försök igen eller välj faktura.
            </p>
          )}
          <CheckoutForm
            profile={{ ...profile, email: user.email ?? "" }}
            discountPercent={discountPercentOf(user.app_metadata)}
            cardEnabled={stripeEnabled()}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
