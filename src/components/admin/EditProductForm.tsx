"use client";

import { useState } from "react";
import { X, Check, Package, Save } from "lucide-react";
import { updateProduct } from "@/app/actions/products";
import ImageManager from "@/components/admin/ImageManager";

const BRANDS = [
  { name: "Garrett",     logo: "/brands/kisspng-turbocharger-garrett-airesearch-business-engine-in-garrett-5b3dfc697c5e14.6655578415307889695094.jpg" },
  { name: "BorgWarner",  logo: "/brands/BorgWarner.png.webp" },
  { name: "Mitsubishi",  logo: "/brands/Mitsubishi_logo.svg" },
  { name: "Holset",      logo: "/brands/hol10652_10.jpg" },
  { name: "IHI",         logo: "/brands/IHI_square.png.avif" },
  { name: "Toyota",      logo: "/brands/kisspng-toyota-corolla-car-toyota-motor-sales-u-s-a-inc-1713918574954.webp" },
  { name: "BMTS",        logo: "/brands/BMTS.jpeg" },
  { name: "Hitachi",     logo: "/brands/Hitachi-Logo.png" },
  { name: "Valeo",       logo: "/brands/Valeo_Logo.svg.png" },
  { name: "Continental", logo: "/brands/continental-logo-png_seeklogo-270061.png" },
  { name: "CZ Turbo",    logo: "/brands/Logo_CZ.jpg" },
  { name: "Master",      logo: "/brands/master2.png" },
];

const CATEGORIES = [
  "Turboladdare", "Turbodelar", "Kompressorhjul",
  "Packningar & Tätningar", "Reparationskit", "Utrustning",
];

interface Props { product: any; onClose: () => void; onSaved: () => void; }

export default function EditProductForm({ product, onClose, onSaved }: Props) {
  const [brand, setBrand]         = useState<string>(product.brand ?? "");
  const [category, setCategory]   = useState<string>(product.category ?? "");
  const [name, setName]           = useState(product.name ?? "");
  const [sku, setSku]             = useState(product.sku ?? "");
  const [price, setPrice]         = useState(String(product.price ?? ""));
  const [description, setDescription] = useState(product.description ?? "");
  const [inStock, setInStock]     = useState(product.in_stock !== false);
  const [images, setImages]       = useState<string[]>(product.images ?? []);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "brand">("info");

  const handleSave = async () => {
    if (!name.trim()) { setError("Produktnamn krävs."); return; }
    if (!brand) { setError("Välj ett varumärke."); return; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) { setError("Ange ett giltigt pris."); return; }
    setSaving(true);
    setError(null);
    try {
      await updateProduct(product.id, { name: name.trim(), brand, category, sku: sku.trim(), price: Number(price), images, description: description.trim(), in_stock: inStock });
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? "Något gick fel, försök igen.");
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #222" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {images[0] ? (
              <img src={images[0]} alt="" style={{ width: 32, height: 32, objectFit: "contain", background: "#1a1a1a", borderRadius: 6 }} />
            ) : (
              <div style={{ width: 32, height: 32, background: "#1a1a1a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Package size={16} color="#555" />
              </div>
            )}
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Redigera produkt</h2>
              <p style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: 4, display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #222" }}>
          {[{ key: "info", label: "Produktinfo" }, { key: "brand", label: "Varumärke & kategori" }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab.key ? "#dc2626" : "transparent"}`, color: activeTab === tab.key ? "#fff" : "#666", padding: "12px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "color 0.15s" }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>

          {/* ── INFO TAB ── */}
          {activeTab === "info" && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 6 }}>Produktnamn <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 6 }}>Artikelnummer</label>
                  <input type="text" value={sku} onChange={e => setSku(e.target.value)} style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 6 }}>Pris (kr) <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} min={0} style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 6 }}>Produktbeskrivning</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              {/* In stock toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#ccc" }}>Lagerstatus</p>
                  <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{inStock ? "I lager" : "Slut i lager"}</p>
                </div>
                <button onClick={() => setInStock(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: inStock ? "#dc2626" : "#333", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: inStock ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </button>
              </div>

              {/* Multi-image manager */}
              <div style={{ marginBottom: 20 }}>
                <ImageManager images={images} onChange={setImages} />
              </div>
            </>
          )}

          {/* ── BRAND TAB ── */}
          {activeTab === "brand" && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#999", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Varumärke</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 28 }}>
                {BRANDS.map(b => (
                  <button key={b.name} onClick={() => setBrand(b.name)} style={{ background: brand === b.name ? "#1a0000" : "#0f0f0f", border: `2px solid ${brand === b.name ? "#dc2626" : "#222"}`, borderRadius: 10, padding: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.15s", position: "relative" }}>
                    {brand === b.name && <div style={{ position: "absolute", top: 4, right: 4, background: "#dc2626", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={10} color="#fff" strokeWidth={3} /></div>}
                    <div style={{ background: "#fff", borderRadius: 6, padding: "3px 6px", width: 64, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={b.logo} alt={b.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontSize: 10, color: brand === b.name ? "#fff" : "#666", fontWeight: 500, textAlign: "center" }}>{b.name}</span>
                  </button>
                ))}
              </div>

              <p style={{ fontSize: 13, fontWeight: 600, color: "#999", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Kategori</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} style={{ background: category === cat ? "#dc2626" : "#0f0f0f", border: `1px solid ${category === cat ? "#dc2626" : "#333"}`, borderRadius: 20, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: category === cat ? "#fff" : "#aaa", transition: "all 0.15s" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 24 }}>
            {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={handleSave} disabled={saving} style={{ width: "100%", background: saving ? "#333" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: 13, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Save size={16} />
              {saving ? "Sparar..." : "Spara ändringar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
