"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAccountType } from "@/app/actions/auth";
import { signInErrorMessage } from "@/lib/auth/messages";
import LogoViewerWrapper from "@/components/LogoViewerWrapper";

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8,
  padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box",
};

export default function AdminLoginForm({ notice }: { notice: string | null }) {
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError(signInErrorMessage(signInError));
      setLoading(false);
      return;
    }

    const type = await getAccountType().catch(() => "none" as const);
    if (type !== "admin") {
      await supabase.auth.signOut();
      setError("Kontot saknar adminbehörighet. Kunder loggar in via hemsidan.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <LogoViewerWrapper silver />
        </div>

        <form onSubmit={handleLogin} style={{ background: "#141414", border: "1px solid #222", borderRadius: 16, padding: 32 }}>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 24px 0" }}>Logga in som admin</h1>

          {notice && (
            <p role="status" style={{ background: "#1f1a0a", border: "1px solid #3a2f0f", color: "#f59e0b", fontSize: 13, borderRadius: 8, padding: "10px 12px", margin: "0 0 20px 0", lineHeight: 1.45 }}>
              {notice}
            </p>
          )}

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="admin-email" style={{ display: "block", color: "#999", fontSize: 13, marginBottom: 6 }}>E-post</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="admin-password" style={{ display: "block", color: "#999", fontSize: 13, marginBottom: 6 }}>Lösenord</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p role="alert" style={{ color: "#ef4444", fontSize: 13, margin: "0 0 16px 0", textAlign: "center" }}>{error}</p>
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
