"use client";

import { useState, useActionState, useTransition } from "react";
import { createDiscountCode, toggleDiscountCode, deleteDiscountCode } from "@/app/admin/(dashboard)/customers/actions";
import { useRouter } from "next/navigation";
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy } from "lucide-react";

type Code = {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  applies_to: string;
  applies_to_value: string | null;
  assigned_to_email: string | null;
  is_active: boolean;
  created_at: string;
};

type Customer = { email: string; name: string };

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "TURBO-" + Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

function CodeBadge({ code, active }: { code: string; active: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} title="Kopiera kod" style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: active ? "#1a2a1a" : "#1f1f1f",
      border: `1px solid ${active ? "#22c55e44" : "#2a2a2a"}`,
      borderRadius: 6, padding: "3px 10px", cursor: "pointer", color: active ? "#4ade80" : "#666",
      fontFamily: "monospace", fontSize: 13, fontWeight: 700, letterSpacing: 1,
    }}>
      {code}
      <Copy size={11} style={{ opacity: 0.6 }} />
      {copied && <span style={{ fontSize: 10, color: "#4ade80" }}>Kopierad!</span>}
    </button>
  );
}

function CodeRow({ c, onRefresh }: { c: Code; onRefresh: () => void }) {
  const [, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleDiscountCode(c.id, !c.is_active);
      onRefresh();
    });
  }
  function handleDelete() {
    if (!confirm(`Ta bort koden "${c.code}"?`)) return;
    startTransition(async () => {
      await deleteDiscountCode(c.id);
      onRefresh();
    });
  }

  const expired = c.expires_at && new Date(c.expires_at) < new Date();
  const exhausted = c.max_uses !== null && c.uses_count >= c.max_uses;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
      borderBottom: "1px solid #1a1a1a", flexWrap: "wrap",
    }}>
      <CodeBadge code={c.code} active={c.is_active && !expired && !exhausted} />

      <div style={{ flex: 1, minWidth: 120 }}>
        <p style={{ fontSize: 12, color: "#fff", margin: 0 }}>
          <span style={{ color: c.type === "percentage" ? "#60a5fa" : "#f59e0b", fontWeight: 700 }}>
            {c.type === "percentage" ? `${c.value}%` : `${c.value} kr`}
          </span>
          {c.min_order_value > 0 && <span style={{ color: "#555" }}> · Min {c.min_order_value} kr</span>}
        </p>
        <p style={{ fontSize: 11, color: "#555", margin: 0 }}>
          {c.applies_to === "all" ? "Alla produkter" : c.applies_to === "category" ? `Kategori: ${c.applies_to_value}` : `Produkt: ${c.applies_to_value}`}
          {" · "}
          {c.max_uses !== null ? `${c.uses_count}/${c.max_uses} använda` : `${c.uses_count} använda`}
          {c.expires_at && ` · Går ut ${new Date(c.expires_at).toLocaleDateString("sv-SE")}`}
        </p>
      </div>

      {(expired || exhausted) && (
        <span style={{ fontSize: 10, color: "#ef4444", background: "#1f0000", border: "1px solid #3f0000", borderRadius: 4, padding: "2px 6px" }}>
          {expired ? "Utgången" : "Slut"}
        </span>
      )}

      <button onClick={handleToggle} title={c.is_active ? "Inaktivera" : "Aktivera"} style={{ background: "none", border: "none", cursor: "pointer", color: c.is_active ? "#4ade80" : "#555", padding: 4 }}>
        {c.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
      </button>
      <button onClick={handleDelete} title="Ta bort" style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function CreateCodeForm({ assignedTo, onDone }: { assignedTo: string | null; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createDiscountCode, { success: false } as any);
  const [appliesTo, setAppliesTo] = useState("all");
  const [code, setCode] = useState(genCode);
  const [type, setType] = useState("percentage");

  if ((state as any).success) { onDone(); router.refresh(); }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
      <input type="hidden" name="assigned_to_email" value={assignedTo ?? ""} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Code */}
        <div>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Kod *</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input name="code" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 10px", color: "#4ade80", fontSize: 13, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }} />
            <button type="button" onClick={() => setCode(genCode())}
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "0 10px", color: "#888", fontSize: 11, cursor: "pointer" }}>
              Ny
            </button>
          </div>
        </div>

        {/* Type + Value */}
        <div>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Rabatt *</label>
          <div style={{ display: "flex", gap: 6 }}>
            <select name="type" value={type} onChange={e => setType(e.target.value)}
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 8px", color: "#fff", fontSize: 13, cursor: "pointer" }}>
              <option value="percentage">%</option>
              <option value="fixed">kr</option>
            </select>
            <input name="value" type="number" min="1" max={type === "percentage" ? 100 : undefined} placeholder={type === "percentage" ? "10" : "500"}
              style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13 }} />
          </div>
        </div>

        {/* Min order */}
        <div>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Minsta ordervärde (kr)</label>
          <input name="min_order_value" type="number" min="0" placeholder="0"
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13, boxSizing: "border-box" }} />
        </div>

        {/* Max uses */}
        <div>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Max användningar (tomt = obegränsat)</label>
          <input name="max_uses" type="number" min="1" placeholder="Obegränsat"
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13, boxSizing: "border-box" }} />
        </div>

        {/* Expires */}
        <div>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Utgångsdatum (valfritt)</label>
          <input name="expires_at" type="date"
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13, boxSizing: "border-box" }} />
        </div>

        {/* Applies to */}
        <div>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Gäller för</label>
          <select name="applies_to" value={appliesTo} onChange={e => setAppliesTo(e.target.value)}
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13, cursor: "pointer", boxSizing: "border-box" }}>
            <option value="all">Alla produkter</option>
            <option value="category">Specifik kategori</option>
            <option value="product">Specifik produkt (SKU)</option>
          </select>
        </div>
      </div>

      {appliesTo !== "all" && (
        <div>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>
            {appliesTo === "category" ? "Kategori" : "Produkt SKU"}
          </label>
          <input name="applies_to_value" placeholder={appliesTo === "category" ? "t.ex. Turboladdare" : "t.ex. 715910-0001"}
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 10px", color: "#fff", fontSize: 13, boxSizing: "border-box" }} />
        </div>
      )}

      {(state as any).error && (
        <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{(state as any).error}</p>
      )}

      <button type="submit" disabled={pending} style={{
        background: pending ? "#555" : "#dc2626", color: "#fff", border: "none",
        borderRadius: 7, padding: "10px", fontSize: 13, fontWeight: 600, cursor: pending ? "not-allowed" : "pointer",
      }}>
        {pending ? "Skapar..." : "Skapa rabattkod"}
      </button>
    </form>
  );
}

type Props = {
  customers: Customer[];
  codes: Code[];
};

export default function DiscountCodesManager({ customers, codes }: Props) {
  const router = useRouter();
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [showGlobalForm, setShowGlobalForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const globalCodes = codes.filter(c => !c.assigned_to_email);
  const customerCodes = (email: string) => codes.filter(c => c.assigned_to_email === email);
  const selectedCustomer = customers.find(c => c.email === selectedEmail);

  function refresh() { router.refresh(); }

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Tag size={16} color="#f59e0b" />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Rabattkoder</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Left: Global codes */}
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Globala koder</p>
              <p style={{ fontSize: 11, color: "#555", margin: 0 }}>Alla kunder kan använda dessa</p>
            </div>
            <button onClick={() => setShowGlobalForm(v => !v)} style={{
              background: "#dc2626", color: "#fff", border: "none", borderRadius: 6,
              padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Plus size={12} /> Ny kod
            </button>
          </div>

          {showGlobalForm && (
            <div style={{ background: "#0f0f0f", border: "1px solid #1f1f1f", borderRadius: 8, padding: 16, marginBottom: 14 }}>
              <CreateCodeForm assignedTo={null} onDone={() => setShowGlobalForm(false)} />
            </div>
          )}

          {globalCodes.length === 0 ? (
            <p style={{ color: "#555", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Inga globala koder än</p>
          ) : (
            globalCodes.map(c => <CodeRow key={c.id} c={c} onRefresh={refresh} />)
          )}
        </div>

        {/* Right: Per-customer codes */}
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>Kund-specifika koder</p>
            <select
              value={selectedEmail ?? ""}
              onChange={e => { setSelectedEmail(e.target.value || null); setShowCustomerForm(false); }}
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 7, padding: "8px 10px", color: selectedEmail ? "#fff" : "#666", fontSize: 13, cursor: "pointer" }}
            >
              <option value="">Välj en kund...</option>
              {customers.map(c => (
                <option key={c.email} value={c.email}>
                  {c.name} ({c.email}) — {customerCodes(c.email).length} kod{customerCodes(c.email).length !== 1 ? "er" : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedEmail && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                  {selectedCustomer?.name} · {customerCodes(selectedEmail).length} kod{customerCodes(selectedEmail).length !== 1 ? "er" : ""}
                </p>
                <button onClick={() => setShowCustomerForm(v => !v)} style={{
                  background: "#dc2626", color: "#fff", border: "none", borderRadius: 6,
                  padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Plus size={11} /> Ny kod
                </button>
              </div>

              {showCustomerForm && (
                <div style={{ background: "#0f0f0f", border: "1px solid #1f1f1f", borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <CreateCodeForm assignedTo={selectedEmail} onDone={() => setShowCustomerForm(false)} />
                </div>
              )}

              {customerCodes(selectedEmail).length === 0 ? (
                <p style={{ color: "#555", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Inga koder för den här kunden än</p>
              ) : (
                customerCodes(selectedEmail).map(c => <CodeRow key={c.id} c={c} onRefresh={refresh} />)
              )}
            </>
          )}

          {!selectedEmail && (
            <p style={{ color: "#555", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Välj en kund ovan för att hantera deras koder</p>
          )}
        </div>
      </div>
    </div>
  );
}
