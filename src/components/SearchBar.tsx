"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  name: string;
  brand: string;
  sku: string | null;
  price: number;
  images: string[] | null;
  category: string | null;
  badge: string | null;
  in_stock: boolean | null;
}

export default function SearchBar({ mobile = false }: { mobile?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 180);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (!query.trim()) return;
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function handleSearchClick() {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function handleResultClick(id: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/produkt/${id}`);
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ display: "flex" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim() && results.length > 0) setOpen(true);
          }}
          placeholder={
            mobile
              ? "Sök artikelnummer, varumärke..."
              : "Sök på artikelnummer, varumärke eller modell..."
          }
          autoComplete="off"
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRight: "none",
            borderRadius: "6px 0 0 6px",
            padding: mobile ? "8px 12px" : "8px 16px",
            fontSize: 14,
            outline: "none",
            minWidth: 0,
          }}
          onFocusCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "#ef4444";
          }}
          onBlurCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "#d1d5db";
          }}
        />
        <button
          onClick={handleSearchClick}
          style={{
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "0 6px 6px 0",
            padding: mobile ? "8px 12px" : "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#b91c1c")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#dc2626")}
        >
          Sök
        </button>
      </div>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            zIndex: 99999,
            overflow: "hidden",
          }}
        >
          {loading && (
            <div style={{ padding: "14px 16px", color: "#9ca3af", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #e5e7eb", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              Söker...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Inga produkter hittades</p>
              <p style={{ fontSize: 12, color: "#9ca3af" }}>Prova ett annat artikelnummer eller varumärke</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div style={{ padding: "8px 14px 6px", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {results.length} resultat
                </span>
              </div>
              {results.map((r, i) => (
                <div
                  key={r.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleResultClick(r.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    cursor: "pointer",
                    borderBottom: i < results.length - 1 ? "1px solid #f9fafb" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fef2f2")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 6,
                    background: "#f3f4f6",
                    flexShrink: 0,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #e5e7eb",
                  }}>
                    {r.images?.[0] ? (
                      <img src={r.images[0]} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 2 }} />
                    ) : (
                      <svg width="22" height="22" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
                        <circle cx="12" cy="12" r="4" strokeWidth="1.5" />
                        <path strokeWidth="1.5" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
                      </svg>
                    )}
                  </div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#111827",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.3,
                    }}>
                      {r.name}
                    </p>
                    <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {r.brand}{r.category ? ` · ${r.category}` : ""}
                    </p>
                    {r.sku && (
                      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, fontFamily: "monospace" }}>
                        {r.sku}
                      </p>
                    )}
                  </div>

                  {/* Price + stock */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      {Number(r.price).toLocaleString("sv-SE")} kr
                    </p>
                    <p style={{
                      fontSize: 10,
                      fontWeight: 600,
                      marginTop: 3,
                      color: r.in_stock !== false ? "#16a34a" : "#dc2626",
                    }}>
                      {r.in_stock !== false ? "I lager" : "Slut"}
                    </p>
                  </div>
                </div>
              ))}

              {/* Footer link */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }}
                style={{
                  padding: "10px 14px",
                  borderTop: "1px solid #f3f4f6",
                  fontSize: 12,
                  color: "#dc2626",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fef2f2")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
              >
                Visa alla resultat för "{query}" →
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
