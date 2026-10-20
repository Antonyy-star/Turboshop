"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { placeOrder } from "@/app/actions/checkout";
import { discountedPrice, formatKr, formatPercent } from "@/lib/pricing";
import type { OrderCustomer, PaymentMethod } from "@/lib/orders";

type Props = { profile: OrderCustomer; discountPercent: number; cardEnabled: boolean };

export default function CheckoutForm({ profile, discountPercent, cardEnabled }: Props) {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [payment, setPayment] = useState<PaymentMethod>("invoice");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const unit = (price: number) => discountedPrice(price, discountPercent);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = items.reduce((s, i) => s + unit(i.price) * i.quantity, 0);
  const savings = subtotal - total;

  if (items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="font-bold text-black mb-1">Varukorgen är tom</p>
        <p className="text-sm text-gray-500 mb-5">Lägg till produkter innan du går till kassan.</p>
        <Link href="/katalog" className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-md text-sm">
          Till katalogen
        </Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const res = await placeOrder({
          lines: items.map(i => ({ id: i.id, qty: i.quantity })),
          payment, reference, message,
        });
        if (!res.ok) { setError(res.error); return; }
        if (payment === "invoice") {
          clearCart();
          router.push(res.redirectUrl);
        } else {
          // The cart is emptied when Stripe sends the customer back after paying.
          window.location.href = res.redirectUrl;
        }
      } catch {
        setError("Beställningen kunde inte skickas. Kontrollera anslutningen och försök igen.");
      }
    });
  }

  const address = [profile.adress, [profile.postnummer, profile.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const card = "bg-white border border-gray-200 rounded-xl p-5 md:p-6";

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
      <div className="space-y-6 min-w-0">
        {/* Items */}
        <section className={card} aria-labelledby="co-items">
          <h2 id="co-items" className="font-bold text-black mb-4">Din beställning</h2>
          <ul className="divide-y divide-gray-100">
            {items.map(i => (
              <li key={i.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-14 h-14 shrink-0 rounded-lg border border-gray-100 bg-white flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element -- small cart thumbnail */}
                  {i.image ? <img src={i.image} alt="" className="w-full h-full object-contain p-1" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black leading-snug">{i.name}</p>
                  <p className="text-xs text-gray-500">{[i.brand, i.sku].filter(Boolean).join(" · ")} · {i.quantity} st</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-black">{formatKr(unit(i.price) * i.quantity)}</p>
                  {discountPercent > 0 && <p className="text-xs text-gray-400 line-through">{formatKr(i.price * i.quantity)}</p>}
                </div>
              </li>
            ))}
          </ul>
          <Link href="/cart" className="inline-block mt-4 text-sm text-red-600 hover:text-red-700 font-medium">Ändra i varukorgen</Link>
        </section>

        {/* Customer */}
        <section className={card} aria-labelledby="co-customer">
          <h2 id="co-customer" className="font-bold text-black mb-4">Dina uppgifter</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {([
              ["Namn", profile.name], ["Företag", profile.foretag], ["E-post", profile.email],
              ["Telefon", profile.telefon], ["Organisationsnummer", profile.orgnr], ["Adress", address],
            ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt className="text-xs text-gray-500">{k}</dt><dd className="text-black break-words">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-gray-500">
            Stämmer något inte? <Link href="/kontakt" className="text-red-600 hover:text-red-700">Kontakta oss</Link> så uppdaterar vi dina uppgifter.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <label className="block text-sm">
              <span className="block text-gray-700 mb-1.5">Er referens <span className="text-gray-400">(valfritt)</span></span>
              <input value={reference} onChange={e => setReference(e.target.value)} maxLength={120}
                placeholder="T.ex. ordernummer eller bilens regnummer"
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 focus:outline-none focus:border-gray-500" />
            </label>
          </div>
          <label className="block text-sm mt-4">
            <span className="block text-gray-700 mb-1.5">Meddelande till oss <span className="text-gray-400">(valfritt)</span></span>
            <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={3}
              placeholder="T.ex. önskemål om leverans eller hämtning"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 focus:outline-none focus:border-gray-500 resize-y" />
          </label>
        </section>

        {/* Payment */}
        <fieldset className={card}>
          <legend className="font-bold text-black px-1 -mx-1">Betalning</legend>
          <div className="mt-3 space-y-3">
            <PaymentOption checked={payment === "invoice"} onSelect={() => setPayment("invoice")}
              title="Faktura" text="Vi skickar en faktura när beställningen är bekräftad." />
            <PaymentOption checked={payment === "card"} onSelect={() => setPayment("card")} disabled={!cardEnabled}
              title="Kort eller Klarna"
              text={cardEnabled ? "Betala direkt med kort, Apple Pay, Google Pay eller Klarna via Stripe." : "Inte tillgängligt än."} />
          </div>
        </fieldset>

        {/* Delivery */}
        <section className={card} aria-labelledby="co-delivery">
          <h2 id="co-delivery" className="font-bold text-black mb-2">Leverans</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Vi kontaktar dig om leverans eller hämtning i Norsborg när beställningen är bekräftad.
            Produkter som inte finns i lager beställer vi hem, och vi meddelar leveranstiden.
          </p>
        </section>
      </div>

      {/* Summary */}
      <aside className={`${card} lg:sticky lg:top-24`} aria-labelledby="co-summary">
        <h2 id="co-summary" className="font-bold text-black mb-4">Summering</h2>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Produkter ({items.reduce((s, i) => s + i.quantity, 0)} st)</span><span>{formatKr(subtotal)}</span></div>
          {discountPercent > 0 && savings > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">Din kundrabatt ({formatPercent(discountPercent)})</span><span className="text-red-600">−{formatKr(savings)}</span></div>
          )}
          <div className="flex justify-between"><span className="text-gray-500">Leverans</span><span className="text-gray-400">Enligt överenskommelse</span></div>
        </div>
        <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-baseline">
          <span className="font-bold text-black">Att betala</span>
          <span className="font-black text-black text-2xl">{formatKr(total)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Inkl. moms</p>

        {error && <p role="alert" className="mt-4 text-sm text-red-600 leading-relaxed">{error}</p>}

        <button type="submit" disabled={pending}
          className="mt-5 w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-lg transition">
          {pending ? "Skickar…" : payment === "card" ? "Gå till betalning" : "Skicka beställning"}
        </button>
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          {payment === "card"
            ? "Du skickas till Stripes säkra betalsida och tillbaka hit när betalningen är klar."
            : "Beställningen är bindande när vi har bekräftat den."}
        </p>
      </aside>
    </form>
  );
}

function PaymentOption({ checked, onSelect, title, text, disabled }: {
  checked: boolean; onSelect: () => void; title: string; text: string; disabled?: boolean;
}) {
  return (
    <label className={`flex gap-3 items-start rounded-lg border p-4 transition ${
      disabled ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
        : checked ? "border-red-500 bg-red-50/50 cursor-pointer" : "border-gray-200 hover:border-gray-400 cursor-pointer"}`}>
      <input type="radio" name="payment" className="mt-1 accent-red-600" checked={checked} disabled={disabled} onChange={onSelect} />
      <span>
        <span className="block text-sm font-semibold text-black">{title}</span>
        <span className="block text-sm text-gray-500">{text}</span>
      </span>
    </label>
  );
}
