"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import AdvancedBadge from "./AdvancedBadge";
import LogoViewerWrapper from "./LogoViewerWrapper";

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
  { name: "Turboladdare", type: "brands" },
  { name: "Turbodelar", type: "list", subcategories: ["Kompressorhjul", "Turbinhjul", "Lagerhus", "Packningar & tätningar", "Aktuatorer"] },
  { name: "Kontaktformulär", type: "link", href: "/kontakt" },
  { name: "Katalog", type: "link", href: "/katalog", badge: "Avancerat" },
  { name: "Kontakta oss", type: "link", href: "/kontakta-oss" },
];

export default function Header() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const closeMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setMobileOpen(false);
      setIsClosing(false);
    }, 220);
  };

  return (
    <>
      {/* ── Header — never touched by mobile menu state ── */}
      <header className="bg-white sticky top-0 z-50">

        {/* Top bar — desktop only */}
        <div className="bg-black text-white text-xs py-2 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span>📞 +46 72 911 00 35</span>
              <span>✉️ info@ttturbo.se</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/account" className="hover:text-gray-300 transition">Logga in</Link>
              <span className="text-gray-600">|</span>
              <Link href="/account/register" className="hover:text-gray-300 transition">Registrera</Link>
            </div>
          </div>
        </div>

        {/* Main row */}
        <div className="max-w-7xl mx-auto px-4 py-1 md:py-2 flex items-center justify-between gap-2 min-w-0">
          <Link href="/" className="flex items-center gap-0 min-w-0 overflow-hidden flex-shrink-0" style={{ maxWidth: "calc(100vw - 110px)" }}>
            <div className="mt-0 md:mt-[10px]" style={{ flexShrink: 0 }}>
              <LogoViewerWrapper />
            </div>
            <img
              src="/3d%20Logo/turboteknik_wordmark_transparent.png"
              alt="TurboTeknik"
              className="hidden sm:block"
              style={{ height: 34, width: "auto", maxWidth: 200, marginLeft: -4, flexShrink: 1 }}
            />
          </Link>

          {/* Search — desktop only */}
          <div className="hidden md:flex flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Sök på artikelnummer, varumärke eller modell..."
              className="w-full border border-gray-300 rounded-l-md px-4 py-2 text-sm focus:outline-none focus:border-red-500"
            />
            <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-r-md transition text-sm">
              Sök
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/cart" className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium hidden sm:inline">Varukorg (0)</span>
            </Link>

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-2 text-gray-700"
              onClick={() => setMobileOpen(true)}
              aria-label="Öppna meny"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden px-4 pb-1">
          <div className="flex">
            <input type="text" placeholder="Sök..." className="w-full border border-gray-300 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:border-red-500" />
            <button className="bg-red-600 text-white px-3 py-2 rounded-r-md text-sm">Sök</button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="bg-black text-white hidden md:block">
          <div className="max-w-7xl mx-auto px-4">
            <ul className="flex items-center">
              {categories.map((cat) => (
                <li
                  key={cat.name}
                  className="relative"
                  onMouseEnter={() => setActiveMenu(cat.name)}
                  onMouseLeave={() => setActiveMenu(null)}
                >
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
                            className="group flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg p-2 hover:border-red-400 hover:bg-red-50 transition" style={{ height: 60 }}>
                            <img src={brand.logo} alt={brand.name} className="object-contain transition duration-200" style={{ maxWidth: 80, maxHeight: 40 }} />
                          </Link>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Link href="/kategori/turboladdare" className="text-sm text-red-600 hover:text-red-700 font-medium">
                          Visa alla turboladdare →
                        </Link>
                      </div>
                    </div>
                  )}

                  {activeMenu === cat.name && cat.type === "list" && (
                    <ul className="absolute top-full left-0 bg-white text-black shadow-xl border border-gray-200 min-w-[220px] z-50">
                      {cat.subcategories?.map((sub) => (
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
              <li className="ml-auto">
                <Link href="/erbjudanden" className="px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 transition block">
                  🔥 Heta erbjudanden
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      {/* ── Mobile menu portal — rendered into document.body, covers from top:0 ── */}
      {mounted && (mobileOpen || isClosing) && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: "#000",
            opacity: 1,
            animation: isClosing ? "mobileMenuOut 220ms ease forwards" : "mobileMenuIn 220ms ease forwards",
          }}
        >
          {/* Logo row — mirrors the real header layout */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px" }}>
            <Link href="/" onClick={closeMenu} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <img
                src="/3d%20Logo/turboteknik_wordmark_transparent.png"
                alt="TurboTeknik"
                style={{ height: 34, width: "auto", maxWidth: 180, filter: "brightness(0) invert(1)" }}
              />
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link
                href="/cart"
                style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "#dc2626", color: "#fff", padding: "8px 12px", borderRadius: 6, textDecoration: "none", fontSize: 14 }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </Link>

              <button
                onClick={closeMenu}
                aria-label="Stäng meny"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 8 }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ padding: "4px 16px 10px" }}>
            <div style={{ display: "flex" }}>
              <input
                type="text"
                placeholder="Sök..."
                style={{
                  flex: 1,
                  border: "1px solid #d1d5db",
                  borderRight: "none",
                  borderRadius: "6px 0 0 6px",
                  padding: "8px 12px",
                  fontSize: 14,
                  backgroundColor: "#fff",
                  color: "#000",
                  outline: "none",
                }}
              />
              <button style={{ backgroundColor: "#dc2626", color: "#fff", padding: "8px 14px", borderRadius: "0 6px 6px 0", border: "none", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
                Sök
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid #1f2937" }} />

          {/* Nav items */}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {categories.map((cat) => (
              <li key={cat.name} style={{ borderBottom: "1px solid #1a1a1a" }}>
                <Link
                  href={(cat as any).href ?? `/kategori/${cat.name.toLowerCase()}`}
                  style={{ display: "block", padding: "15px 20px", fontSize: 15, fontWeight: 500, color: "#fff", textDecoration: "none" }}
                  onClick={closeMenu}
                >
                  {cat.name}
                </Link>
              </li>
            ))}

            {/* Gå tillbaka */}
            <li style={{ borderTop: "1px solid #1f2937" }}>
              <button
                onClick={closeMenu}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "14px 20px",
                  fontSize: 14, fontWeight: 500, color: "#ef4444",
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Gå tillbaka
              </button>
            </li>
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}
