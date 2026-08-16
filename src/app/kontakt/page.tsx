"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function KontaktPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const data = {
      fornamn: (form.fornamn as any).value,
      efternamn: (form.efternamn as any).value,
      foretag: (form.foretag as any).value,
      registreringsskylt: (form.registreringsskylt as any).value,
      email: (form.email as any).value,
      telefon: (form.telefon as any).value,
      amne: (form.amne as any).value,
      meddelande: (form.meddelande as any).value,
    };

    const supabase = createClient();
    const { error: err } = await supabase.from("contact_submissions").insert([data]);

    if (err) {
      setError("Något gick fel. Försök igen.");
    } else {
      setSuccess(true);
      form.reset();
    }
    setLoading(false);
  }

  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen py-16">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Kontakta oss</h1>
          <p className="text-gray-500 mb-10">Fyll i formuläret så återkommer vi inom 24 timmar.</p>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-green-800 mb-2">Meddelande skickat!</h2>
              <p className="text-green-700 text-sm">Vi återkommer till dig inom 24 timmar.</p>
              <button onClick={() => setSuccess(false)} className="mt-5 text-sm text-green-700 underline">
                Skicka ett nytt meddelande
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Förnamn</label>
                  <input name="fornamn" type="text" placeholder="Erik" className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Efternamn</label>
                  <input name="efternamn" type="text" placeholder="Svensson" className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Företag</label>
                <input name="foretag" type="text" placeholder="AB Exempel" className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registreringsskylt</label>
                <input name="registreringsskylt" type="text" placeholder="ABC 123" className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-postadress</label>
                <input name="email" type="email" required placeholder="erik@exempel.se" className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer</label>
                <input name="telefon" type="tel" placeholder="+46 70 000 00 00" className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ämne</label>
                <select name="amne" className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 bg-white">
                  <option>Turbo Renovering</option>
                  <option>Beställning & leverans</option>
                  <option>Retur & garanti</option>
                  <option>Teknisk support</option>
                  <option>Övrigt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meddelande</label>
                <textarea name="meddelande" rows={5} placeholder="Beskriv ditt ärende här..." className="w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 resize-none" />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-md transition text-sm">
                {loading ? "Skickar..." : "Skicka meddelande"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
