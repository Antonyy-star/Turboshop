"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import AdvancedBadge from "./AdvancedBadge";
import LogoViewerWrapper from "./LogoViewerWrapper";
import SearchBar from "./SearchBar";

const brandLogos = [
  { name: "Garrett", logo: "/brands/kisspng-turbocharger-garrett-airesearch-business-engine-in-garrett-5b3dfc697c5e14.6655578415307889695094.jpg" },
  { name: "BorgWarner", logo: "/brands/BorgWarner.png.webp" },
  { name: "Mitsubishi", logo: "/brands/Mitsubishi_logo.svg" },
  { name: "Holset", logo: "/brands/hol10652_10.jpg" },
  { name: "IHI", logo: "/brands/IHI_square.png.avif" },
  { name: "Toyota", logo: "/brands/kisspng-toyota-corolla-car-toyota-motor-sales-u-s-a-inc-1713918574954.webp" },
  { name: "BMTS", logo: "/brands/BMTS.jpeg" },
  { name: "Hitachi", logo: "/brands/Hitachi-Logo.png" },
  { name: "Valeo", logo: "/brands/Valeo_Logo.svg.png" },
  { name: "Continental", logo: "/brands/continental-logo-png_seeklogo-270061.png" },
  { name: "CZ Turbo", logo: "/brands/Logo_CZ.jpg" },
  { name: "Master", logo: "/brands/master2.png" },
];

const categories = [
  { name: "Turboladdare", href: "/kategori/turboladdare" },
  { name: "Turbodelar", href: "/kategori/turbodelar" },
  { name: "Reparationsutrustning", href: "/kategori/utrustning" },
  { name: "Tuning", href: "/kategori/tuning" },
  { name: "Kontaktformulär", href: "/kontakt" },
  { name: "Katalog", href: "/katalog" },
  { name: "Kontakta oss", href: "/kontakta-oss" },
];

const desktopCategories = [
  { name: "Turboladdare", type: "brands" },
  { name: "Turbodelar", type: "link", href: "/kategori/turbodelar" },
  { name: "Utrustning", type: "link", href: "/kategori/utrustning" },
  { name: "Tuning", type: "link", href: "/kategori/tuning" },
  { name: "Kontaktformulär", type: "link", href: "/kontakt" },
  { name: "Katalog", type: "link", href: "/katalog", badge: "Avancerat" },
  { name: "Kontakta oss", type: "link", href: "/kontakta-oss" },
];

export default function Header() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* Header — never changes */}
      <header className="bg-white sticky top-0 z-50">

        {/* Main row */}
        <div className="max-w-7xl mx-auto px-4 py-1 md:py-2 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-0 flex-shrink-0" style={{ maxWidth: "calc(100vw - 110px)" }}>
            <div className="mt-0 md:mt-[10px]" style={{ flexShrink: 0 }}>
              <LogoViewerWrapper />
            </div>
            <img
              src="/3d%20Logo/turboteknik_wordmark_transparent.png"
              alt="TurboTeknik"
              className="hidden sm:block wordmark-img"
            />
          </Link>

          <div className="hidden md:flex flex-1 max-w-xl">
            <SearchBar />
          </div>

          <div className="flex items-center gap-3">
            <Link href="/cart" className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium hidden sm:inline">Varukorg (0)</span>
            </Link>

            <Link href="/admin/login" className="flex items-center p-1 hover:opacity-70 transition">
              <svg className="w-6 h-6" fill="black" stroke="black" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>

            <button
              className="md:hidden p-2 text-gray-700"
              onClick={() => setMenuOpen(true)}
              aria-label="Öppna meny"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-4 pb-2">
          <SearchBar mobile />
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:block bg-black text-white">
          <div className="max-w-7xl mx-auto px-4">
            <ul className="flex items-center">
              {desktopCategories.map((cat) => (
                <li key={cat.name} className="relative" onMouseEnter={() => setActiveMenu(cat.name)} onMouseLeave={() => setActiveMenu(null)}>
                  {cat.type === "link" ? (
                    <Link href={(cat as any).href} className="px-4 py-3 text-sm font-medium hover:bg-red-600 transition block relative">
                      {(cat as any).badge && (
                        <span className="absolute left-1/2 -translate-x-1/2" style={{ top: "-14px" }}>
                          <AdvancedBadge />
                        </span>
                      )}
                      {cat.name}
                    </Link>
                  ) : (
                    <button className="px-4 py-3 text-sm font-medium hover:bg-red-600 transition flex items-center gap-1">
                      {cat.name}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                  {activeMenu === cat.name && cat.type === "brands" && (
                    <div className="absolute top-full left-0 bg-white text-black shadow-xl border border-gray-200 z-50 p-4" style={{ width: 420 }}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Handla efter varumärke</p>
                      <div className="grid grid-cols-4 gap-2">
                        {brandLogos.map((brand) => (
                          <Link key={brand.name} href={`/marke/${brand.name.toLowerCase().replace(/\s+/g, "-")}`}
                            className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg p-2 hover:border-red-400 hover:bg-red-50 transition" style={{ height: 60 }}>
                            <img src={brand.logo} alt={brand.name} className="object-contain" style={{ maxWidth: 80, maxHeight: 40 }} />
                          </Link>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Link href="/kategori/turboladdare" className="text-sm text-red-600 hover:text-red-700 font-medium">Visa alla turboladdare →</Link>
                      </div>
                    </div>
                  )}
                  {activeMenu === cat.name && cat.type === "list" && (
                    <ul className="absolute top-full left-0 bg-white text-black shadow-xl border border-gray-200 min-w-[220px] z-50">
                      {(cat as any).subcategories?.map((sub: string) => (
                        <li key={sub}>
                          <Link href={`/kategori/${sub.toLowerCase().replace(/\s+/g, "-")}`}
                            className="block px-4 py-2 text-sm hover:bg-red-50 hover:text-red-600 border-b border-gray-100 transition">
                            {sub}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/* Mobile menu — full screen solid black overlay */}
      {mounted && menuOpen && createPortal(
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          backgroundColor: "#000000",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Top row: wordmark + X */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #222" }}>
            <Link href="/" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
                TURBO<span style={{ color: "#ef4444" }}>TEKNIK</span>
              </span>
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#fff" }}
              aria-label="Stäng meny"
            >
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1 }}>
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "18px 20px",
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#ffffff",
                  textDecoration: "none",
                  borderBottom: "1px solid #1a1a1a",
                }}
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* Gå tillbaka */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #222" }}>
            <button
              onClick={() => setMenuOpen(false)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 15, fontWeight: 600, padding: 0 }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Gå tillbaka
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
