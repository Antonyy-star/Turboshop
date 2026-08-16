import Link from "next/link";
import OpenStatusBadge from "./OpenStatusBadge";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        <div>
          <span className="text-xl font-black tracking-tight">
            TURBO<span className="text-red-500">TEKNIK</span>
          </span>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">Produkter</h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li><Link href="#" className="hover:text-white transition">Turboladdare</Link></li>
            <li><Link href="#" className="hover:text-white transition">Patroner (CHRA)</Link></li>
            <li><Link href="#" className="hover:text-white transition">Turbodelar</Link></li>
            <li><Link href="#" className="hover:text-white transition">Prestandadelar</Link></li>
            <li><Link href="#" className="hover:text-white transition">Utrustning</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">Företag</h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li><Link href="#" className="hover:text-white transition">Om oss</Link></li>
            <li><Link href="#" className="hover:text-white transition">Kontakt</Link></li>
            <li><Link href="#" className="hover:text-white transition">Fraktinformation</Link></li>
            <li><Link href="#" className="hover:text-white transition">Returer & Garanti</Link></li>
            <li><Link href="#" className="hover:text-white transition">Integritetspolicy</Link></li>
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide">Kontakt</h4>
            <OpenStatusBadge />
          </div>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>📞 +46 72 911 00 35</li>
            <li>✉️ info@ttturbo.se</li>
            <li>📍 Kumla Gårdsväg 26A, 145 63 Norsborg</li>
            <li className="pt-2 leading-relaxed">
              <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Öppettider</span>
              Mån–Fre: 09.00 – 18.00<br />
              Lör: 10.00 – 15.00
            </li>
          </ul>
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Vi accepterar:</p>
            <div className="flex gap-2 flex-wrap">
              {["Visa", "Mastercard", "PayPal", "Swish"].map((pm) => (
                <span key={pm} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">{pm}</span>
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
