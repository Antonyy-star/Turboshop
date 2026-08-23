"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

type Props = {
  product: {
    id: string;
    name: string;
    brand: string;
    sku: string;
    price: number;
    image: string;
  };
};

export default function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    addItem(product, qty);
    router.push("/cart");
  }

  return (
    <div className="mb-4">
      {/* Qty + Köp nu on first row, Lägg i varukorg full width below on mobile */}
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          value={qty}
          min={1}
          onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-14 border border-gray-300 rounded-md px-2 py-3 text-sm text-center focus:outline-none focus:border-red-500"
        />
        <button
          onClick={handleBuyNow}
          className="flex-1 bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-md transition text-sm"
        >
          Köp nu
        </button>
      </div>
      <button
        onClick={handleAdd}
        className={`w-full font-bold py-3 rounded-md transition text-sm ${
          added
            ? "bg-green-600 text-white"
            : "bg-red-600 hover:bg-red-700 text-white"
        }`}
      >
        {added ? "✓ Tillagd!" : "Lägg i varukorg"}
      </button>
    </div>
  );
}
