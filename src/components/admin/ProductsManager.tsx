"use client";

import { useState } from "react";
import { Package, Pencil, Trash2 } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import EditProductForm from "@/components/admin/EditProductForm";
import { deleteProduct } from "@/app/actions/products";
import { useRouter } from "next/navigation";

export default function ProductsManager({ initialProducts }: { initialProducts: any[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function handleSaved() {
    setShowForm(false);
    setEditProduct(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteId);
      setDeleteId(null);
      router.refresh();
    } catch (e) {
      alert("Kunde inte ta bort produkten. Försök igen.");
    }
    setDeleting(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Produkter</h1>
          <p style={{ color: "#666", fontSize: 14 }}>{initialProducts.length} produkter totalt</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          + Ny produkt
        </button>
      </div>

      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1f1f1f", background: "#0f0f0f" }}>
              {["Produkt", "Varumärke", "Kategori", "Pris", "Status", ""].map((h, i) => (
                <th key={i} style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontSize: 12, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initialProducts.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} style={{ width: 40, height: 40, objectFit: "contain", background: "#1a1a1a", borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, background: "#1a1a1a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Package size={18} color="#555" />
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</p>
                      {p.sku && <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{p.sku}</p>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "#999" }}>{p.brand}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "#999" }}>{p.category ?? "—"}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600 }}>{Number(p.price).toLocaleString("sv-SE")} kr</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    background: p.in_stock !== false ? "#14532d" : "#450a0a",
                    color: p.in_stock !== false ? "#4ade80" : "#f87171",
                    fontSize: 12, fontWeight: 500, padding: "3px 8px", borderRadius: 6,
                  }}>
                    {p.in_stock !== false ? "I lager" : "Slut"}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setEditProduct(p)}
                      title="Redigera"
                      style={{ background: "#1f1f1f", border: "1px solid #2a2a2a", borderRadius: 7, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", color: "#aaa" }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      title="Ta bort"
                      style={{ background: "#1a0000", border: "1px solid #3a0000", borderRadius: 7, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", color: "#ef4444" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New product modal */}
      {showForm && (
        <ProductForm onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}

      {/* Edit product modal */}
      {editProduct && (
        <EditProductForm product={editProduct} onClose={() => setEditProduct(null)} onSaved={handleSaved} />
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => !deleting && setDeleteId(null)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #3a0000", borderRadius: 16, width: "100%", maxWidth: 400, padding: 28 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 44, height: 44, background: "#1a0000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={20} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Ta bort produkt?</h2>
            <p style={{ fontSize: 13, color: "#666", textAlign: "center", marginBottom: 24 }}>
              {initialProducts.find(p => p.id === deleteId)?.name ?? "Produkten"} tas bort permanent. Det går inte att ångra.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                style={{ flex: 1, background: "#1f1f1f", border: "1px solid #2a2a2a", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, color: "#aaa", cursor: "pointer" }}
              >
                Avbryt
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, background: deleting ? "#333" : "#dc2626", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, color: "#fff", cursor: deleting ? "not-allowed" : "pointer" }}
              >
                {deleting ? "Tar bort..." : "Ta bort"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
