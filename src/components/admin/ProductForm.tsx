"use client";

import { useState } from "react";
import { X, ChevronLeft, Check, Package } from "lucide-react";
import { createProduct } from "@/app/actions/products";
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

type Step = 1 | 2;

interface Props { onClose: () => void; onSaved: () => void; }

export default function ProductForm({ onClose, onSaved }: Props) {
  const [step, setStep]           = useState<Step>(1);
  const [brand, setBrand]         = useState("");
  const [category, setCategory]   = useState("");
  const [name, setName]           = useState("");
  const [sku, setSku]             = useState("");
  const [price, setPrice]         = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages]       = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const goToStep2 = () => {
    if (!brand || !category) { setError("Välj ett varumärke och en kategori."); return; }
    setError(null);
    setStep(2);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Produktnamn krävs."); return; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) { setError("Ange ett giltigt pris."); return; }
    if (images.length === 0) { setError("Lägg till minst en produktbild."); return; }
    setSaving(true);
    setError(null);
    try {
      await createProduct({ name: name.trim(), brand, category, sku: sku.trim(), price: Number(price), images, description: description.trim() });
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? "Något gick fel, försök igen.");
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #222" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {step === 2 && (
              <button onClick={() => { setStep(1); setError(null); }} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: 4, display: "flex" }}>
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Ny produkt</h2>
              <p style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Steg {step} av 2 — {step === 1 ? "Varumärke & kategori" : "Produktinformation"}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: 4, display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* Step bar */}
        <div style={{ display: "flex", padding: "16px 24px 0", gap: 8 }}>
          {[1, 2].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? "#dc2626" : "#2a2a2a", transition: "background 0.2s" }} />)}
        </div>

        <div style={{ padding: 24 }}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#999", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Välj varumärke</p>
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

              <p style={{ fontSize: 13, fontWeight: 600, color: "#999", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Välj kategori</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} style={{ background: category === cat ? "#dc2626" : "#0f0f0f", border: `1px solid ${category === cat ? "#dc2626" : "#333"}`, borderRadius: 20, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: category === cat ? "#fff" : "#aaa", transition: "all 0.15s" }}>
                    {cat}
                  </button>
                ))}
              </div>

              {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
              <button onClick={goToStep2} style={{ width: "100%", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: 13, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Fortsätt →
              </button>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
              {/* Brand+category summary */}
              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ background: "#fff", borderRadius: 4, padding: "1px 4px", height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={BRANDS.find(b => b.name === brand)?.logo} alt={brand} style={{ height: 16, maxWidth: 40, objectFit: "contain" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "#ccc" }}>{brand}</span>
                </div>
                <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "6px 14px" }}>
                  <span style={{ fontSize: 12, color: "#ccc" }}>{category}</span>
                </div>
              </div>

              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 6 }}>Produktnamn <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="T.ex. Garrett GTX2867R Gen II" style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* SKU + Price */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 6 }}>Artikelnummer</label>
                  <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="T.ex. GAR-GTX2867R" style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 6 }}>Pris (kr) <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="T.ex. 4990" min={0} style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", color: "#999", fontSize: 12, marginBottom: 6 }}>Produktbeskrivning</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Beskriv produkten — specifikationer, kompatibilitet, egenskaper..." rows={3} style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
              </div>

              {/* Multi-image manager */}
              <div style={{ marginBottom: 20 }}>
                <ImageManager images={images} onChange={setImages} />
              </div>

              {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
              <button onClick={handleSave} disabled={saving} style={{ width: "100%", background: saving ? "#333" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: 13, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Package size={16} />
                {saving ? "Sparar..." : "Lägg till produkt"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
