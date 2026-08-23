"use client";

import { useState } from "react";

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

export default function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-hidden h-56 md:h-[400px]">
        <Placeholder />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden h-56 md:h-[400px]">
        <DirectImage
          src={images[active]}
          alt={name}
          className="w-full h-full object-contain p-3 md:p-4"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`border-2 rounded-lg overflow-hidden flex-shrink-0 transition ${
                i === active ? "border-red-500" : "border-gray-200 hover:border-gray-400"
              }`}
              style={{ width: 64, height: 64 }}
            >
              <DirectImage src={img} alt={`${name} ${i + 1}`} className="w-full h-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
