"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

// Empties the cart once the order has been placed. The saved copy is removed
// too: this runs before the cart has loaded it on a fresh page load.
export default function ClearCart() {
  const { clearCart } = useCart();
  useEffect(() => {
    try { localStorage.removeItem("tt-cart"); } catch {}
    clearCart();
  }, [clearCart]);
  return null;
}
