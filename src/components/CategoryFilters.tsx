"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  slug: string;
  brands: string[];
  selectedBrands: string[];
  prisMin: string;
  prisMax: string;
  lager: boolean;
};

export default function CategoryFilters({ slug, brands, selectedBrands, prisMin, prisMax, lager }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [minVal, setMinVal] = useState(prisMin);
  const [maxVal, setMaxVal] = useState(prisMax);

  function navigate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("sida");
    router.push(`/kategori/${slug}?${params.toString()}`, { scroll: false });
  }

  function toggleBrand(brand: string) {
    const current = new Set(selectedBrands);
    if (current.has(brand)) current.delete(brand);
    else current.add(brand);
    navigate({ marke: current.size > 0 ? [...current].join(",") : null });
  }

  function applyPrice() {
    navigate({ prisMin: minVal || null, prisMax: maxVal || null });
  }

  function clearAll() {
    router.push(`/kategori/${slug}`, { scroll: false });
  }

  const hasFilters = selectedBrands.length > 0 || prisMin || prisMax || lager;

  return (
    <aside className="hidden md:block w-56 flex-shrink-0">
      {hasFilters && (
        <button
          onClick={clearAll}
          className="w-full mb-3 text-xs text-red-600 hover:text-red-700 font-medium border border-red-200 rounded-lg py-1.5 bg-red-50 hover:bg-red-100 transition"
        >
          Rensa alla filter ×
        </button>
      )}

      {/* Brand filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="font-bold text-sm text-black mb-3 uppercase tracking-wide">Varumärke</h3>
        {brands.length === 0 ? (
          <p className="text-xs text-gray-400">Inga varumärken</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {brands.map((brand) => (
              <li key={brand} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`brand-${brand}`}
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="accent-red-600 cursor-pointer w-3.5 h-3.5 flex-shrink-0"
                />
                <label
                  htmlFor={`brand-${brand}`}
                  className="text-sm text-gray-700 cursor-pointer hover:text-red-600 transition leading-tight"
                >
                  {brand}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Price filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="font-bold text-sm text-black mb-3 uppercase tracking-wide">Pris (kr)</h3>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={minVal}
            onChange={(e) => setMinVal(e.target.value)}
            placeholder="Min"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-red-500"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="number"
            value={maxVal}
            onChange={(e) => setMaxVal(e.target.value)}
            placeholder="Max"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        <button
          onClick={applyPrice}
          className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 rounded transition"
        >
          Tillämpa
        </button>
      </div>

      {/* Availability filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-sm text-black mb-3 uppercase tracking-wide">Tillgänglighet</h3>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <input
              type="checkbox"
              id="filter-lager"
              checked={lager}
              onChange={() => navigate({ lager: lager ? null : "1" })}
              className="accent-red-600 cursor-pointer w-3.5 h-3.5"
            />
            <label htmlFor="filter-lager" className="text-sm text-gray-700 cursor-pointer hover:text-red-600 transition">
              I lager
            </label>
          </li>
        </ul>
      </div>
    </aside>
  );
}
