"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type Open = (href: string, title: string) => void;
const CLOSE_MESSAGE = "tt-quickview-close";
const QuickViewContext = createContext<Open | null>(null);

// Quick view, like the eye icon on turbocentras.com: shows a catalog page in a
// window over the current page. The page is loaded with ?vy=snabb, which hides
// the site header and footer.
export function QuickViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<{ href: string; title: string } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!view) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setView(null); };
    // Escape pressed inside the quick view page arrives as a message from the frame.
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === CLOSE_MESSAGE) setView(null);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("message", onMessage);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("message", onMessage);
      previous?.focus?.();
    };
  }, [view]);

  const src = view ? `${view.href}${view.href.includes("?") ? "&" : "?"}vy=snabb` : "";

  return (
    <QuickViewContext.Provider value={(href, title) => setView({ href, title })}>
      {children}
      {view && (
        <div
          className="fixed inset-0 z-[1000] bg-black/60 flex items-start justify-center p-2 sm:p-6"
          onMouseDown={e => { if (e.target === e.currentTarget) setView(null); }}
        >
          <div role="dialog" aria-modal="true" aria-label={view.title}
            className="bg-white w-full max-w-6xl h-[92vh] sm:h-[86vh] rounded-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-bold text-black uppercase tracking-wide truncate">{view.title}</h2>
              <div className="flex items-center gap-1 shrink-0">
                <a href={view.href} target="_blank" rel="noopener"
                  className="text-sm text-[#0891b2] hover:text-red-600 hover:underline px-2 py-1">
                  Öppna i ny flik
                </a>
                <button ref={closeRef} type="button" onClick={() => setView(null)} aria-label="Stäng"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            </div>
            <iframe key={src} src={src} title={view.title} className="flex-1 w-full border-0 bg-[#f5f5f5]" />
          </div>
        </div>
      )}
    </QuickViewContext.Provider>
  );
}

// A part or turbo number that opens its catalog page in the quick view.
export function QuickViewLink({ href, title, children, className }: {
  href: string; title: string; children: React.ReactNode; className?: string;
}) {
  const open = useContext(QuickViewContext);
  if (!open) return <a href={href} className={className}>{children}</a>;
  return (
    <button type="button" onClick={() => open(href, title)} className={className} title={`Snabbvy: ${title}`}>
      {children}
    </button>
  );
}

export function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Rendered by catalog pages in quick view mode: Escape closes the window around them.
export function QuickViewFrameBridge() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || window.parent === window) return;
      // Let an open image zoom handle Escape first (it calls preventDefault).
      setTimeout(() => {
        if (!e.defaultPrevented) window.parent.postMessage({ type: CLOSE_MESSAGE }, window.location.origin);
      }, 0);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
