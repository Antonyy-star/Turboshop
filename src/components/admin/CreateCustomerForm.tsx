"use client";

import { useActionState, useState } from "react";
import { createCustomer } from "@/app/admin/(dashboard)/customers/actions";
import { useRouter } from "next/navigation";

type State = { error: string; success?: undefined } | { success: boolean; error?: undefined };
const initial: State = { success: false };

export default function CreateCustomerForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createCustomer, initial);
  const router = useRouter();

  if (state.success && open) {
    router.refresh();
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "#dc2626", color: "#fff", border: "none", borderRadius: 8,
          padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        + Skapa kund
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#111", border: "1px solid #222", borderRadius: 14,
            padding: 32, width: "100%", maxWidth: 440,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Skapa ny kund</h2>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { name: "name",     label: "Namn *",      type: "text",     placeholder: "Förnamn Efternamn" },
                { name: "email",    label: "E-post *",    type: "email",    placeholder: "kund@exempel.se" },
                { name: "password", label: "Lösenord *",  type: "password", placeholder: "Minst 6 tecken" },
                { name: "telefon",  label: "Telefon",     type: "tel",      placeholder: "+46 70 000 00 00" },
                { name: "foretag",  label: "Företag",     type: "text",     placeholder: "Företagsnamn" },
              ].map(f => (
                <div key={f.name}>
                  <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 5 }}>{f.label}</label>
                  <input
                    name={f.name}
                    type={f.type}
                    placeholder={f.placeholder}
                    style={{
                      width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
                      borderRadius: 7, padding: "9px 12px", color: "#fff", fontSize: 13,
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              {state.error && (
                <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{state.error}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                style={{
                  background: pending ? "#555" : "#dc2626", color: "#fff", border: "none",
                  borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 600,
                  cursor: pending ? "not-allowed" : "pointer", marginTop: 4,
                }}
              >
                {pending ? "Skapar..." : "Skapa kund"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
