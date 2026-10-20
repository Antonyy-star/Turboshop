"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogSuggestion } from "@/lib/catalog/search";

const MIN_LENGTH = 3;

// Advanced catalog search: turbo numbers, OEM numbers, models and part numbers.
// Suggests matching turbos and parts while typing; Enter shows the full results.
export default function CatalogSearchBox({ initial = "", autoFocus = false }: { initial?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(initial);
  const [suggestions, setSuggestions] = useState<CatalogSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch suggestions shortly after the visitor stops typing.
  function onInput(next: string) {
    setValue(next);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    const q = next.trim();
    if (q.replace(/[^a-z0-9]/gi, "").length < MIN_LENGTH) {
      requestId.current++;
      setSuggestions([]);
      return;
    }
    const id = ++requestId.current;
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalog-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (id === requestId.current) { setSuggestions(data.suggestions ?? []); setActive(-1); }
      } catch {
        if (id === requestId.current) setSuggestions([]);
      }
    }, 180);
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(q: string) {
    const query = q.trim();
    if (!query) return;
    setOpen(false);
    router.push(`/katalog/sok?s=${encodeURIComponent(query)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault(); setOpen(true); setActive(a => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault(); setActive(a => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(active >= 0 && open ? suggestions[active].query : value);
    }
  }

  const showList = open && suggestions.length > 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        role="search"
        onSubmit={e => { e.preventDefault(); go(value); }}
        className="flex w-full"
      >
        <label htmlFor={`${listId}-input`} className="sr-only">Sök i katalogen</label>
        <input
          id={`${listId}-input`}
          type="search"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          onChange={e => onInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Turbonummer, OEM-nummer, modell eller artikelnummer"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${listId}-list`}
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          className="flex-1 min-w-0 border border-gray-300 border-r-0 rounded-l-md px-4 py-3 text-[15px] text-black placeholder:text-gray-400 focus:outline-none focus:border-gray-500"
        />
        <button
          type="submit"
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 md:px-7 rounded-r-md transition text-[15px]"
        >
          Sök
        </button>
      </form>

      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.kind}-${s.label}-${i}`}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); go(s.query); }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-baseline gap-3 px-4 py-2.5 cursor-pointer text-sm border-b border-gray-100 last:border-0 ${i === active ? "bg-gray-100" : ""}`}
            >
              <span className={`shrink-0 w-12 text-[11px] font-semibold ${s.kind === "turbo" ? "text-red-600" : "text-gray-500"}`}>
                {s.kind === "turbo" ? "Turbo" : "Del"}
              </span>
              <span className="font-mono font-semibold text-black">{s.label}</span>
              <span className="text-gray-500 truncate">{s.detail}</span>
            </li>
          ))}
        </ul>
      )}
      <span className="sr-only" role="status">
        {showList ? `${suggestions.length} förslag. Använd pil upp och ned för att välja.` : ""}
      </span>
    </div>
  );
}
