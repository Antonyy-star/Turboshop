"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

const ZOOM = 2.5;
const SWIPE_DISTANCE = 50;

// Product thumbnails plus a full-screen viewer: browse with arrows, keys,
// thumbnails or swipe, and click (or tap) the image to zoom in and pan.
export default function ProductImageViewer({ images, sku }: { images: string[]; sku: string }) {
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

function Lightbox({ images, sku, start, onClose }: {
  images: string[]; sku: string; start: number; onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number; moved: boolean; type: string } | null>(null);
  const count = images.length;

  const go = useCallback((delta: number) => {
    setZoomed(false);
    setIndex(i => (i + delta + count) % count);
  }, [count]);

  // Lock page scroll, focus the dialog, and give focus back when it closes.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); if (zoomed) setZoomed(false); else onClose(); }
      else if (e.key === "ArrowRight" && count > 1) { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" && count > 1) { e.preventDefault(); go(-1); }
      else if (e.key === "Tab" && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>("button");
        if (items.length === 0) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose, zoomed, count]);

  // Preload the neighbours so browsing feels instant.
  useEffect(() => {
    if (count < 2) return;
    for (const d of [1, -1]) {
      const img = new window.Image();
      img.src = images[(index + d + count) % count];
    }
  }, [index, images, count]);

  function originFrom(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return origin;
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    pointer.current = { x: e.clientX, y: e.clientY, moved: false, type: e.pointerType };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = pointer.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) p.moved = true;
    if (!zoomed) return;
    if (e.pointerType === "mouse") {
      // Mouse: the zoomed view follows the cursor.
      setOrigin(originFrom(e.clientX, e.clientY));
    } else if (p) {
      // Touch / pen: drag the image around like a map.
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((e.clientX - p.x) / rect.width) * 100 / (ZOOM - 1);
      const dy = ((e.clientY - p.y) / rect.height) * 100 / (ZOOM - 1);
      const clamp = (v: number) => Math.min(100, Math.max(0, v));
      setOrigin(o => ({ x: clamp(o.x - dx), y: clamp(o.y - dy) }));
      p.x = e.clientX;
      p.y = e.clientY;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const p = pointer.current;
    pointer.current = null;
    if (!p) return;
    const dx = e.clientX - p.x;
    // Swipe between images when not zoomed.
    if (!zoomed && p.moved && count > 1 && Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(e.clientY - p.y)) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    // A click or tap toggles zoom, centred on where it landed.
    if (!p.moved) {
      if (!zoomed) setOrigin(originFrom(e.clientX, e.clientY));
      setZoomed(z => !z);
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Bilder för ${sku}`}
      tabIndex={-1}
      className="piv-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{LIGHTBOX_STYLES}</style>

      <div className="piv-top">
        <span className="piv-count" aria-live="polite">
          {sku} <span style={{ opacity: .55 }}>·</span> Bild {index + 1} av {count}
        </span>
        <button type="button" className="piv-icon-btn" onClick={onClose} aria-label="Stäng">
          <CloseIcon />
        </button>
      </div>

      <div className="piv-main">
        {count > 1 && (
          <button type="button" className="piv-nav piv-prev" onClick={() => go(-1)} aria-label="Föregående bild">
            <ChevronIcon dir="left" />
          </button>
        )}

        <div
          ref={stageRef}
          className={`piv-stage${zoomed ? " is-zoomed" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { pointer.current = null; }}
          onMouseLeave={() => { if (zoomed) setOrigin({ x: 50, y: 50 }); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- full-size original for zooming */}
          <img
            key={images[index]}
            src={images[index]}
            alt={`${sku} bild ${index + 1} av ${count}`}
            draggable={false}
            className="piv-img"
            style={{
              transform: zoomed ? `scale(${ZOOM})` : "scale(1)",
              transformOrigin: `${origin.x}% ${origin.y}%`,
            }}
          />
        </div>

        {count > 1 && (
          <button type="button" className="piv-nav piv-next" onClick={() => go(1)} aria-label="Nästa bild">
            <ChevronIcon dir="right" />
          </button>
        )}
      </div>

      <p className="piv-hint">
        {zoomed ? "Klicka igen för att zooma ut" : "Klicka på bilden för att zooma"}
      </p>

      {count > 1 && (
        <div className="piv-strip" role="group" aria-label="Alla bilder">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              className={`piv-strip-btn${i === index ? " is-active" : ""}`}
              onClick={() => { setZoomed(false); setIndex(i); }}
              aria-label={`Visa bild ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
            >
              <Image src={img} alt="" width={64} height={64} style={{ objectFit: "contain", width: "100%", height: "100%" }} />
            </button>
          ))}
        </div>
      )}
    </div>
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

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
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

const LIGHTBOX_STYLES = `
  .piv-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(8,8,8,.94);
    display: flex; flex-direction: column; color: #fff; outline: none;
    animation: piv-in .18s ease-out; }
  @keyframes piv-in { from { opacity: 0; } to { opacity: 1; } }
  .piv-top { display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 12px 16px; flex-shrink: 0; }
  .piv-count { font-size: 13px; font-weight: 600; letter-spacing: .02em; color: #e5e5e5; }
  .piv-icon-btn { background: none; border: none; color: #ddd; cursor: pointer; width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center; border-radius: 50%; }
  .piv-icon-btn:hover { background: rgba(255,255,255,.1); color: #fff; }
  .piv-main { flex: 1; min-height: 0; display: flex; align-items: center; gap: 8px; padding: 0 12px; }
  .piv-stage { flex: 1; height: 100%; min-width: 0; overflow: hidden; position: relative;
    display: flex; align-items: center; justify-content: center; cursor: zoom-in;
    touch-action: pan-y; user-select: none; background: #fff; border-radius: 4px; }
  .piv-stage.is-zoomed { cursor: zoom-out; touch-action: none; }
  .piv-img { max-width: 100%; max-height: 100%; object-fit: contain; display: block;
    transition: transform .25s ease; will-change: transform; pointer-events: none; }
  .piv-stage.is-zoomed .piv-img { transition: transform .25s ease, transform-origin .08s linear; }
  .piv-nav { flex-shrink: 0; width: 48px; height: 48px; border-radius: 50%; border: 1px solid rgba(255,255,255,.18);
    background: rgba(255,255,255,.06); color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: background .15s, border-color .15s; }
  .piv-nav:hover { background: #dc2626; border-color: #dc2626; }
  .piv-hint { margin: 0; padding: 10px 16px 0; text-align: center; font-size: 12px; color: #9a9a9a; flex-shrink: 0; }
  .piv-strip { display: flex; gap: 8px; justify-content: center; padding: 12px 16px 16px;
    overflow-x: auto; flex-shrink: 0; }
  .piv-strip-btn { width: 64px; height: 64px; flex-shrink: 0; padding: 3px; background: #fff; cursor: pointer;
    border: 2px solid transparent; border-radius: 3px; opacity: .55; transition: opacity .15s, border-color .15s; }
  .piv-strip-btn:hover { opacity: .9; }
  .piv-strip-btn.is-active { border-color: #dc2626; opacity: 1; }
  .piv-overlay button:focus-visible { outline: 2px solid #f87171; outline-offset: 2px; }
  @media (max-width: 640px) {
    .piv-main { padding: 0; }
    .piv-stage { border-radius: 0; }
    .piv-nav { position: absolute; z-index: 1; width: 40px; height: 40px; background: rgba(17,17,17,.6); }
    .piv-prev { left: 8px; }
    .piv-next { right: 8px; }
    .piv-main { position: relative; }
    .piv-strip-btn { width: 52px; height: 52px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .piv-overlay { animation: none; }
    .piv-img, .piv-stage.is-zoomed .piv-img { transition: none; }
  }
`;
