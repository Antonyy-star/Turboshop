"use client";

import { useState } from "react";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  proxyImages?: boolean;
}

function proxyUrl(src: string): string {
  return `/api/img?u=${encodeURIComponent(src)}`;
}

export default function ProductImage({ src, alt, className = "w-full h-full object-contain p-2", proxyImages = true }: Props) {
  const [failed, setFailed] = useState(false);

  const imgSrc = src && !failed
    ? (proxyImages && src.includes("turbocentras.com") ? proxyUrl(src) : src)
    : null;

  if (!imgSrc) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-100">
        <svg viewBox="0 0 64 64" fill="none" className="w-12 h-12 text-gray-300">
          <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="3" />
          <circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.4" />
          <path d="M32 4 L32 14 M32 50 L32 60 M4 32 L14 32 M50 32 L60 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M11.5 11.5 L18 18 M46 46 L52.5 52.5 M52.5 11.5 L46 18 M18 46 L11.5 52.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.3" />
        </svg>
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Ingen bild</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
