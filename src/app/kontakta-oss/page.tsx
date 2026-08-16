import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import OpenStatusBadge from "@/components/OpenStatusBadge";

export default function KontaktaOssPage() {
  return (
    <>
      <Header />
      <main className="bg-gray-50 min-h-screen py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Kontakta oss</h1>
          <p className="text-gray-500 mb-10">Vi finns här för att hjälpa dig — oavsett om det gäller tekniska frågor, beställningar eller reparationer.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Contact info */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Kontaktuppgifter</h2>
                  <OpenStatusBadge />
                </div>
                <ul className="space-y-4 text-sm text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-xl">📞</span>
                    <div>
                      <p className="font-semibold text-gray-900">Telefon</p>
                      <p>+46 72 911 00 35</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">✉️</span>
                    <div>
                      <p className="font-semibold text-gray-900">E-post</p>
                      <p>info@ttturbo.se</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="font-semibold text-gray-900">Adress</p>
                      <p>Kumla Gårdsväg 26A</p>
                      <p>145 63 Norsborg</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">🕐</span>
                    <div>
                      <p className="font-semibold text-gray-900">Öppettider</p>
                      <p>Mån–Fre: 09.00 – 18.00</p>
                      <p>Lör: 10.00 – 15.00</p>
                      <p className="text-gray-400">Sön: Stängt</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-red-600 text-white rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">Skicka ett meddelande</h2>
                <p className="text-sm text-red-100 mb-4">Har du en fråga om en produkt eller vill boka en turborenovering? Fyll i vårt formulär så återkommer vi inom 24 timmar.</p>
                <Link href="/kontakt" className="inline-block bg-white text-red-600 font-bold text-sm px-5 py-2.5 rounded-md hover:bg-red-50 transition">
                  Gå till kontaktformulär →
                </Link>
              </div>
            </div>

            {/* Google Maps */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <iframe
                src="https://www.google.com/maps?q=Kumla+G%C3%A5rdsv%C3%A4g+26A,+145+63+Norsborg,+Sweden&output=embed"
                width="100%"
                height="280"
                style={{ border: 0, display: "block" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="TTTurbo karta"
              />
              <div className="p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Besök oss</h2>
                <p className="text-sm text-gray-500">Kumla Gårdsväg 26A, 145 63 Norsborg. Boka gärna ett besök i förväg via telefon eller e-post.</p>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: "🔧", title: "Turborenovering", desc: "Vi renoverar och balanserar turbos för alla märken och modeller." },
              { icon: "📦", title: "Reservdelar", desc: "Stort lager med OEM och eftermarknadsdelar. Snabb leverans." },
              { icon: "🛠️", title: "Teknisk support", desc: "Expertrådgivning om val av turbo eller diagnos av problem." },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
