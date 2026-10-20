import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { requireCustomerPage } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { formatKr, formatPercent } from "@/lib/pricing";
import { PAYMENT_METHOD, type Order } from "@/lib/orders";
import ClearCart from "./ClearCart";

export const metadata: Metadata = { title: "Tack för din beställning", robots: { index: false, follow: false } };

export default async function OrderConfirmationPage({ searchParams }: {
  searchParams: Promise<{ order?: string; session_id?: string }>;
}) {
  const user = await requireCustomerPage("/konto");
  const { order: orderId, session_id } = await searchParams;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) notFound();

  const supabase = createServiceClient();
  const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  let order = data as Order | null;
  if (!order || order.user_id !== user.id) notFound();

  // Card payments: confirm with Stripe right away, in case its notification is still on the way.
  if (order.payment_method === "card" && order.payment_status === "pending" && session_id && stripeEnabled()
      && session_id === order.stripe_session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        const now = new Date().toISOString();
        await supabase.from("orders").update({ payment_status: "paid", paid_at: now, updated_at: now })
          .eq("id", order.id).neq("payment_status", "paid");
        order = { ...order, payment_status: "paid", paid_at: now };
      }
    } catch { /* the webhook will update it */ }
  }

  const paid = order.payment_status === "paid";
  const waiting = order.payment_method === "card" && order.payment_status === "pending";
  const failed = order.payment_status === "failed";

  return (
    <>
      <Header />
      <main className="bg-gray-50 flex-1">
        {!failed && <ClearCart />}
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
          <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
            <p className="text-sm font-semibold text-red-600">Beställning #{order.order_number}</p>
            <h1 className="text-2xl md:text-3xl font-black text-black mt-1">
              {failed ? "Betalningen blev inte klar" : "Tack för din beställning!"}
            </h1>
            <p className="mt-3 text-gray-600 leading-relaxed">
              {failed
                ? "Ingen betalning har dragits. Lägg beställningen igen från varukorgen eller välj faktura."
                : waiting
                  ? "Vi väntar på bekräftelse från betalningen. Den brukar komma inom någon minut."
                  : paid
                    ? "Betalningen är klar. Vi kontaktar dig om leverans eller hämtning i Norsborg."
                    : "Vi har tagit emot din beställning och skickar en faktura när den är bekräftad. Vi kontaktar dig om leverans eller hämtning i Norsborg."}
            </p>

            <ul className="mt-6 divide-y divide-gray-100 border-y border-gray-100">
              {order.items.map(i => (
                <li key={i.product_id} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-semibold text-black">{i.name}</span>
                    <span className="block text-xs text-gray-500">{[i.sku, `${i.qty} st à ${formatKr(i.price)}`].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="font-semibold text-black shrink-0">{formatKr(i.line_total)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 text-sm">
              {order.discount_amount > 0 && (
                <div className="flex justify-between"><dt className="text-gray-500">Kundrabatt ({formatPercent(Number(order.discount_percent))})</dt><dd className="text-red-600">−{formatKr(order.discount_amount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-gray-500">Betalning</dt><dd>{PAYMENT_METHOD[order.payment_method]}{paid ? " (betald)" : ""}</dd></div>
              {order.reference && <div className="flex justify-between"><dt className="text-gray-500">Er referens</dt><dd>{order.reference}</dd></div>}
              <div className="flex justify-between pt-2 text-base"><dt className="font-bold">Totalt</dt><dd className="font-black">{formatKr(order.total)}</dd></div>
            </dl>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/konto" className="text-center bg-black hover:bg-gray-800 text-white font-semibold px-5 py-3 rounded-md text-sm">Mina beställningar</Link>
              <Link href={failed ? "/cart" : "/katalog"} className="text-center border border-gray-300 hover:border-gray-500 text-black font-semibold px-5 py-3 rounded-md text-sm">
                {failed ? "Till varukorgen" : "Fortsätt handla"}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
