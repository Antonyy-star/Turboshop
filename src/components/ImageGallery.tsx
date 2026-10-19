"use client";

import { useState } from "react";
import Lightbox from "./ImageLightbox";

function Placeholder() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-100">
      <svg viewBox="0 0 64 64" fill="none" className="w-20 h-20 text-gray-300">
        <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.4" />
        <path d="M32 4 L32 14 M32 50 L32 60 M4 32 L14 32 M50 32 L60 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M11.5 11.5 L18 18 M46 46 L52.5 52.5 M52.5 11.5 L46 18 M18 46 L11.5 52.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.3" />
      </svg>
      <span className="text-sm text-gray-400 font-medium">Ingen produktbild tillgänglig</span>
    </div>
  );
}

function DirectImage({ src, alt, className, priority }: { src: string; alt: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Placeholder />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- product images come from storage at full size
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

// Main image with thumbnails underneath. Clicking the main image opens the
// full-screen viewer, where the images can be zoomed and browsed.
export default function ImageGallery({ images, name, sku }: { images: string[]; name: string; sku?: string }) {
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-hidden h-56 md:h-[400px]">
        <Placeholder />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        aria-label={`Visa bild ${active + 1} av ${images.length} i större format`}
        className="group relative bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden h-56 md:h-[400px] cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        <DirectImage
          src={images[active]}
          alt={name}
          className="w-full h-full object-contain p-3 md:p-4"
          priority
        />
        <span
          aria-hidden
          className="absolute right-3 bottom-3 w-9 h-9 rounded-md bg-black/75 text-white flex items-center justify-center transition group-hover:bg-red-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </span>
      </button>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Visa bild ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={`border-2 rounded-lg overflow-hidden flex-shrink-0 bg-white transition ${
                i === active ? "border-red-500" : "border-gray-200 hover:border-gray-400"
              }`}
              style={{ width: 64, height: 64 }}
            >
              <DirectImage src={img} alt="" className="w-full h-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}

      {viewerOpen && (
        <Lightbox images={images} sku={sku || name} start={active} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}
