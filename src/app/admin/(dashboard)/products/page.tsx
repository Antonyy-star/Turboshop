import { createClient } from "@/lib/supabase/server";
import { realProducts } from "@/lib/realProducts";
import { Package } from "lucide-react";

export default async function AdminProducts() {
  const supabase = await createClient();
  const { data: dbProducts } = await supabase.from("products").select("*").order("created_at", { ascending: false });

  const products = (dbProducts && dbProducts.length > 0) ? dbProducts : realProducts;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Produkter</h1>
          <p style={{ color: "#666", fontSize: 14 }}>{products.length} produkter totalt</p>
        </div>
        <button style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Ny produkt
        </button>
      </div>

      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1f1f1f", background: "#0f0f0f" }}>
              {["Produkt", "Varumärke", "Pris", "Status"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "#666", fontSize: 12, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p: any) => (
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
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "#999" }}>{p.brand}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600 }}>{Number(p.price).toLocaleString("sv-SE")} kr</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: p.in_stock !== false ? "#14532d" : "#450a0a", color: p.in_stock !== false ? "#4ade80" : "#f87171", fontSize: 12, fontWeight: 500, padding: "3px 8px", borderRadius: 6 }}>
                    {p.in_stock !== false ? "I lager" : "Slut"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
