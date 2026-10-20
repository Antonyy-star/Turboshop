"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

type Product = { id: string; name: string; brand: string; sku: string; price: number; image: string };

// Compact quantity + cart button for catalog tables, like turbocentras.com.
export default function CatalogBuyButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function add() {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  const btn = "w-8 h-8 flex items-center justify-center text-white font-bold transition";
  return (
    <div className="inline-flex items-center">
      <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Minska antal"
        className={`${btn} bg-[#0891b2] hover:bg-[#0e7490] rounded-l`}>−</button>
      <input
        type="number" min={1} value={qty} aria-label={`Antal ${product.sku}`}
        onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
        className="w-10 h-8 border-y border-gray-300 text-center text-sm text-black [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" onClick={() => setQty(q => q + 1)} aria-label="Öka antal"
        className={`${btn} bg-[#0891b2] hover:bg-[#0e7490] rounded-r`}>+</button>
      <button type="button" onClick={add} aria-label={`Lägg ${product.sku} i varukorgen`}
        className={`${btn} ml-1.5 rounded ${added ? "bg-green-600" : "bg-red-600 hover:bg-red-700"}`}>
        {added ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17M17 21a1 1 0 100-2 1 1 0 000 2zM9 21a1 1 0 100-2 1 1 0 000 2z" /></svg>
        )}
      </button>
    </div>
  );
}
