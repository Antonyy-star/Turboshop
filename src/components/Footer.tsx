import Link from "next/link";
import OpenStatusBadge from "./OpenStatusBadge";

export default function Footer() {
  return (
    <footer className="bg-black text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 md:gap-8">

        {/* Brand */}
        <div className="pb-6 mb-6 border-b border-gray-800 md:border-0 md:pb-0 md:mb-0">
          <span className="text-xl font-black tracking-tight">
            TURBO<span className="text-red-500">TEKNIK</span>
          </span>
          <p className="text-gray-400 text-sm mt-2 leading-relaxed">
            Turbospecialister med passion för prestanda. Norsborg, Stockholm.
          </p>
        </div>

        {/* Produkter */}
        <div className="pb-6 mb-6 border-b border-gray-800 md:border-0 md:pb-0 md:mb-0">
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-widest pb-2 border-b border-red-600/25">
            Produkter
          </h4>
          <ul className="space-y-2 text-gray-400 text-sm mt-3">
            <li><Link href="#" className="hover:text-white transition">Turboladdare</Link></li>
            <li><Link href="#" className="hover:text-white transition">Turbodelar</Link></li>
            <li><Link href="#" className="hover:text-white transition">Utrustning</Link></li>
          </ul>
        </div>

        {/* Företag */}
        <div className="pb-6 mb-6 border-b border-gray-800 md:border-0 md:pb-0 md:mb-0">
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-widest pb-2 border-b border-red-600/25">
            Företag
          </h4>
          <ul className="space-y-2 text-gray-400 text-sm mt-3">
            <li><Link href="#" className="hover:text-white transition">Om oss</Link></li>
            <li><Link href="#" className="hover:text-white transition">Kontakt</Link></li>
            <li><Link href="#" className="hover:text-white transition">Fraktinformation</Link></li>
            <li><Link href="#" className="hover:text-white transition">Returer & Garanti</Link></li>
            <li><Link href="#" className="hover:text-white transition">Integritetspolicy</Link></li>
          </ul>
        </div>

        {/* Kontakt */}
        <div>
          <div className="flex items-center gap-3 pb-2 border-b border-red-600/25 mb-3">
            <h4 className="font-semibold text-sm uppercase tracking-widest">Kontakt</h4>
            <OpenStatusBadge />
          </div>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>📞 +46 72 911 00 35</li>
            <li>✉️ info@ttturbo.se</li>
            <li>📍 Kumla Gårdsväg 26A, 145 63 Norsborg</li>
          </ul>

          {/* Google Maps embed */}
          <div className="mt-3 mb-3">
            <iframe
              src="https://www.google.com/maps?q=Kumla+G%C3%A5rdsv%C3%A4g+26A,+145+63+Norsborg,+Sweden&output=embed"
              width="100%"
              height="160"
              style={{ border: 0, borderRadius: 10, display: "block" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="TurboTeknik karta"
            />
          </div>

          <div className="text-gray-400 text-sm leading-relaxed">
            <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Öppettider</span>
            Mån–Fre: 09.00 – 18.00<br />
            Lör: 10.00 – 15.00
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Vi accepterar:</p>
            <div className="grid grid-cols-2 md:flex gap-2">
              {["Visa", "Mastercard", "PayPal", "Swish"].map((pm) => (
                <span key={pm} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded text-center">
                  {pm}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div className="border-t border-gray-800 py-4 text-center text-gray-500 text-xs">
        © 2024 TurboTeknik. Alla rättigheter förbehållna.
      </div>
    </footer>
  );
}
