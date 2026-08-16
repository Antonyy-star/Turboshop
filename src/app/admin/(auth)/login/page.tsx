"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import LogoViewerWrapper from "@/components/LogoViewerWrapper";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Fel e-post eller lösenord.");
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <LogoViewerWrapper silver />
        </div>

        <form onSubmit={handleLogin} style={{ background: "#141414", border: "1px solid #222", borderRadius: 16, padding: 32 }}>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 24, margin: "0 0 24px 0" }}>Logga in</h1>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#999", fontSize: 13, marginBottom: 6 }}>E-post</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@turboteknik.se"
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: "#999", fontSize: 13, marginBottom: 6 }}>Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: loading ? "#333" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </form>
      </div>
    </div>
  );
}
