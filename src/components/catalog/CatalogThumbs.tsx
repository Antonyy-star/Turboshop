"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "@/components/ImageLightbox";


// Catalog pages: small thumbnails that open the full-screen zoom viewer.
export default function CatalogThumbs({ images, sku }: { images: string[]; sku: string }) {
  const [open, setOpen] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div style={{
        width: 110, height: 110, border: "1px solid #e5e7eb",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 10, color: "#9ca3af", textAlign: "center" }}>No image<br />available</span>
      </div>
    );
  }

  return (
    <>
      <style>{THUMB_STYLES}</style>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {images.map((img, i) => (
          <button
            key={img}
            type="button"
            className="piv-thumb"
            onClick={() => setOpen(i)}
            aria-label={`Visa bild ${i + 1} av ${images.length} i större format`}
          >
            <Image
              src={img}
              alt={`${sku} bild ${i + 1}`}
              width={100}
              height={100}
              style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
              priority={i === 0}
              quality={80}
            />
            <span className="piv-thumb-icon" aria-hidden>
              <ZoomIcon />
            </span>
          </button>
        ))}
      </div>
      {open !== null && (
        <Lightbox images={images} sku={sku} start={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function ZoomIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
    </svg>
  );
}



// ── Styles ─────────────────────────────────────────────────────────────────

const THUMB_STYLES = `
  .piv-thumb { position: relative; width: 110px; height: 110px; padding: 4px; background: #fff;
    border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center;
    cursor: zoom-in; transition: border-color .15s; }
  .piv-thumb:hover { border-color: #dc2626; }
  .piv-thumb:focus-visible { outline: 2px solid #dc2626; outline-offset: 2px; }
  .piv-thumb-icon { position: absolute; right: 4px; bottom: 4px; width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center; background: rgba(17,17,17,.75);
    color: #fff; border-radius: 3px; opacity: .8; transition: opacity .15s, background .15s; }
  .piv-thumb:hover .piv-thumb-icon { opacity: 1; background: #dc2626; }
`;

