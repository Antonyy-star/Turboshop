"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, Pencil, Trash2, Search } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import EditProductForm from "@/components/admin/EditProductForm";
import { deleteProduct, updateProductStock } from "@/app/actions/products";

interface Props {
  initialProducts: any[];
  totalCount: number;
  page: number;
  totalPages: number;
  search: string;
  category: string;
}

const CATEGORIES = ["", "Turboladdare", "CHRA", "Turbodelar"];

export default function ProductsManager({
  initialProducts, totalCount, page, totalPages, search, category,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingStock, setTogglingStock] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(search);
  const [, startTransition] = useTransition();

  // Auto-search as you type (debounced 400ms)
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) {
        navigate({ q: searchInput, page: "1", category });
      }
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.page && params.page !== "1") sp.set("page", params.page);
    if (params.category) sp.set("category", params.category);
    startTransition(() => router.push(`/admin/products?${sp.toString()}`, { scroll: false }));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: searchInput, page: "1", category });
  }

  function handleCategory(cat: string) {
    navigate({ q: search, page: "1", category: cat });
  }

  function handlePage(p: number) {
    navigate({ q: search, page: String(p), category });
  }

  async function handleToggleStock(id: string, current: boolean) {
    if (togglingStock) return;
    setTogglingStock(id);
    try {
      await updateProductStock(id, !current);
      router.refresh();
    } catch {
      alert("Kunde inte uppdatera lagerstatus. Försök igen.");
    }
    setTogglingStock(null);
  }

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
    } catch {
      alert("Kunde inte ta bort produkten. Försök igen.");
    }
    setDeleting(false);
  }

  const from = (page - 1) * 50 + 1;
  const to   = Math.min(page * 50, totalCount);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Produkter</h1>
          <p style={{ color: "#666", fontSize: 14 }}>{totalCount.toLocaleString("sv-SE")} produkter totalt</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          + Ny produkt
        </button>
      </div>

      {/* Search + category filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flex: 1, minWidth: 200 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Sök SKU, OEM-nr, namn, varumärke... (bindestreck spelar ingen roll)"
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 12px 8px 30px", fontSize: 13, color: "#fff", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <button type="submit" style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Sök
          </button>
        </form>

        <div style={{ display: "flex", gap: 6 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat || "all"}
              onClick={() => handleCategory(cat)}
              style={{
                background: category === cat ? "#dc2626" : "#1a1a1a",
                color: category === cat ? "#fff" : "#888",
                border: "1px solid",
                borderColor: category === cat ? "#dc2626" : "#2a2a2a",
                borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              {cat || "Alla"}
            </button>
          ))}
        </div>
      </div>

      {/* Results info */}
      {totalCount > 0 && (
        <p style={{ color: "#555", fontSize: 12, marginBottom: 12 }}>
          Visar {from}–{to} av {totalCount.toLocaleString("sv-SE")} produkter
          {search && <span> · Sökning: "{search}"</span>}
        </p>
      )}

      {/* Table */}
      {initialProducts.length === 0 ? (
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <Package size={36} color="#333" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#555", fontSize: 15, marginBottom: 8 }}>Inga produkter hittades</p>
          {search && <p style={{ color: "#444", fontSize: 13 }}>Prova ett annat sökord.</p>}
        </div>
      ) : (
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
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
                        <div style={{ display: "flex", flexShrink: 0 }}>
                          {p.images?.length > 0 ? (
                            p.images.slice(0, 3).map((img: string, idx: number) => (
                              <div key={idx} style={{ width: 36, height: 36, borderRadius: 6, background: "#1a1a1a", border: "2px solid #141414", marginLeft: idx === 0 ? 0 : -8, overflow: "hidden", position: "relative", zIndex: 3 - idx }}>
                                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                              </div>
                            ))
                          ) : (
                            <div style={{ width: 36, height: 36, background: "#1a1a1a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Package size={16} color="#555" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</p>
                          {p.sku && <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 14, color: "#999" }}>{p.brand || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 14, color: "#999" }}>{p.category || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600 }}>{Number(p.price).toLocaleString("sv-SE")} kr</td>
                    <td style={{ padding: "14px 16px" }}>
                      <button
                        onClick={() => handleToggleStock(p.id, p.in_stock !== false)}
                        disabled={togglingStock === p.id}
                        style={{
                          background: togglingStock === p.id ? "#1a1a1a" : (p.in_stock !== false ? "#14532d" : "#450a0a"),
                          color: p.in_stock !== false ? "#4ade80" : "#f87171",
                          fontSize: 12, fontWeight: 500, padding: "3px 8px", borderRadius: 6,
                          border: "none", cursor: togglingStock === p.id ? "wait" : "pointer",
                          opacity: togglingStock === p.id ? 0.6 : 1,
                        }}
                      >
                        {togglingStock === p.id ? "..." : (p.in_stock !== false ? "I lager" : "Slut")}
                      </button>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setEditProduct(p)}
                          style={{ background: "#1f1f1f", border: "1px solid #2a2a2a", borderRadius: 7, padding: "6px 10px", cursor: "pointer", color: "#aaa" }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          style={{ background: "#1a0000", border: "1px solid #3a0000", borderRadius: 7, padding: "6px 10px", cursor: "pointer", color: "#ef4444" }}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px 16px", borderTop: "1px solid #1a1a1a", flexWrap: "wrap" }}>
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page === 1}
                style={{ background: "#1f1f1f", border: "1px solid #2a2a2a", borderRadius: 6, padding: "5px 12px", fontSize: 13, color: page === 1 ? "#444" : "#aaa", cursor: page === 1 ? "default" : "pointer" }}
              >
                ‹
              </button>

              {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
                let p: number;
                if (totalPages <= 9) p = i + 1;
                else if (page <= 5) p = i + 1;
                else if (page >= totalPages - 4) p = totalPages - 8 + i;
                else p = page - 4 + i;
                return (
                  <button
                    key={p}
                    onClick={() => handlePage(p)}
                    style={{
                      background: p === page ? "#dc2626" : "#1f1f1f",
                      border: "1px solid",
                      borderColor: p === page ? "#dc2626" : "#2a2a2a",
                      borderRadius: 6, padding: "5px 10px", fontSize: 13,
                      color: p === page ? "#fff" : "#aaa", cursor: "pointer", minWidth: 34,
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => handlePage(page + 1)}
                disabled={page === totalPages}
                style={{ background: "#1f1f1f", border: "1px solid #2a2a2a", borderRadius: 6, padding: "5px 12px", fontSize: 13, color: page === totalPages ? "#444" : "#aaa", cursor: page === totalPages ? "default" : "pointer" }}
              >
                ›
              </button>

              <span style={{ color: "#555", fontSize: 12, marginLeft: 8 }}>
                Sida {page} av {totalPages}
              </span>
            </div>
          )}
        </div>
      )}

      {showForm    && <ProductForm       onClose={() => setShowForm(false)}    onSaved={handleSaved} />}
      {editProduct && <EditProductForm   product={editProduct} onClose={() => setEditProduct(null)} onSaved={handleSaved} />}

      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => !deleting && setDeleteId(null)}>
          <div style={{ background: "#141414", border: "1px solid #3a0000", borderRadius: 16, width: "100%", maxWidth: 400, padding: 28 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 44, height: 44, background: "#1a0000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={20} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Ta bort produkt?</h2>
            <p style={{ fontSize: 13, color: "#666", textAlign: "center", marginBottom: 24 }}>
              {initialProducts.find(p => p.id === deleteId)?.name ?? "Produkten"} tas bort permanent.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                style={{ flex: 1, background: "#1f1f1f", border: "1px solid #2a2a2a", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, color: "#aaa", cursor: "pointer" }}>
                Avbryt
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, background: deleting ? "#333" : "#dc2626", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, color: "#fff", cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? "Tar bort..." : "Ta bort"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
