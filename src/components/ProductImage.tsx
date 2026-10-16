"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

const SUPABASE_HOST = "hudzxedyjaswddamapwf.supabase.co";

function resolveUrl(src: string): string {
  try {
    const host = new URL(src).hostname;
    if (host === "turbocentras.com" || host.endsWith(".turbocentras.com")) {
      return `/api/img?u=${encodeURIComponent(src)}`;
    }
  } catch {}
  return src;
}

function isOptimizable(src: string) {
  try {
    return new URL(src).hostname === SUPABASE_HOST;
  } catch {
    return false;
  }
}

export default function ProductImage({ src, alt }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = src ? resolveUrl(src) : src;

  if (!resolved || failed) {
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

  if (isOptimizable(resolved)) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-contain p-2"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className="w-full h-full object-contain p-2"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
