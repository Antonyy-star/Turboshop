"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, X } from "lucide-react";
import { updateOrder } from "@/app/admin/(dashboard)/bestallningar/actions";
import { formatKr, formatPercent } from "@/lib/pricing";
import {
  ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS,
  type Order, type OrderStatus, type PaymentStatus,
} from "@/lib/orders";

const C = { surface: "#141414", deep: "#0f0f0f", border: "#1f1f1f", strong: "#2a2a2a", muted: "#999", faint: "#666", red: "#dc2626" };

const STATUS_COLORS: Record<OrderStatus, { fg: string; bg: string }> = {
  new:        { fg: "#fbbf24", bg: "#3a2a07" },
  processing: { fg: "#60a5fa", bg: "#0f2440" },
  ready:      { fg: "#a78bfa", bg: "#24173f" },
  completed:  { fg: "#4ade80", bg: "#14532d" },
  cancelled:  { fg: "#9ca3af", bg: "#1f1f1f" },
};
const PAY_COLORS: Record<PaymentStatus, string> = {
  unpaid: "#fbbf24", pending: "#fbbf24", paid: "#4ade80", failed: "#f87171", refunded: "#9ca3af",
};

type Filter = "active" | OrderStatus | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "active", label: "Att hantera" },
  { key: "new", label: "Nya" },
  { key: "processing", label: "Behandlas" },
  { key: "ready", label: "Klara" },
  { key: "completed", label: "Slutförda" },
  { key: "cancelled", label: "Avbrutna" },
  { key: "all", label: "Alla" },
];
// Card orders whose payment never went through are not real orders yet.
const isAbandoned = (o: Order) => o.payment_method === "card" && (o.payment_status === "pending" || o.payment_status === "failed");
const matches = (o: Order, f: Filter) =>
  f === "all" ? true
    : f === "active" ? ["new", "processing", "ready"].includes(o.status) && !isAbandoned(o)
      : o.status === f;

const STYLES = `
  .om-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; border-radius:8px; font-size:13px; font-weight:600;
    cursor:pointer; padding:9px 16px; border:1px solid transparent; min-height:38px; transition: background .15s, border-color .15s; }
  .om-btn:disabled { opacity:.55; cursor:not-allowed; }
  .om-primary { background:${C.red}; color:#fff; } .om-primary:hover:not(:disabled) { background:#b91c1c; }
  .om-ghost { background:transparent; color:#ddd; border-color:${C.strong}; } .om-ghost:hover:not(:disabled) { background:#1c1c1c; }
  .om-input { width:100%; background:#1a1a1a; border:1px solid ${C.strong}; border-radius:7px; padding:9px 12px; color:#fff; font-size:13px; box-sizing:border-box; min-height:38px; }
  .om-input:focus { border-color:#555; outline:none; }
  .om-row { cursor:pointer; } .om-row:hover { background:#171717; }
  .om-tab { background:transparent; border:1px solid ${C.strong}; color:#aaa; border-radius:999px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; }
  .om-tab[aria-pressed="true"] { background:${C.red}; border-color:${C.red}; color:#fff; }
  .om-btn:focus-visible, .om-input:focus-visible, .om-tab:focus-visible, .om-row:focus-visible { outline:2px solid #f87171; outline-offset:2px; }
  .om-cards { display:none; }
  @media (max-width: 760px) { .om-table { display:none; } .om-cards { display:block; } }
`;

function Pill({ text, fg, bg }: { text: string; fg: string; bg: string }) {
  return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{text}</span>;
}

function StatusPill({ o }: { o: Order }) {
  if (isAbandoned(o) && o.status !== "cancelled") return <Pill text="Ej betald" fg="#f87171" bg="#3f1212" />;
  const c = STATUS_COLORS[o.status];
  return <Pill text={ORDER_STATUS[o.status].label} fg={c.fg} bg={c.bg} />;
}

function PayText({ o }: { o: Order }) {
  return (
    <span style={{ fontSize: 12 }}>
      <span style={{ color: "#ccc" }}>{PAYMENT_METHOD[o.payment_method]}</span>
      <span style={{ color: PAY_COLORS[o.payment_status] }}> · {PAYMENT_STATUS[o.payment_status]}</span>
    </span>
  );
}

const date = (iso: string) => new Date(iso).toLocaleString("sv-SE", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function OrdersManager({ orders, loadFailed }: { orders: Order[]; loadFailed: boolean }) {
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = orders.find(o => o.id === openId) ?? null;

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.key, orders.filter(o => matches(o, f.key)).length])), [orders]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(o => matches(o, filter)).filter(o => !q || [
      String(o.order_number), o.customer?.name, o.customer?.foretag, o.customer?.email, o.reference ?? "",
    ].some(v => (v ?? "").toLowerCase().includes(q)));
  }, [orders, filter, query]);

  return (
    <section aria-labelledby="orders-title">
      <style>{STYLES}</style>
      <h1 id="orders-title" style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Beställningar</h1>
      <p style={{ color: C.faint, fontSize: 14, margin: "0 0 20px", maxWidth: 620, lineHeight: 1.5 }}>
        Beställningar från kundernas kassa. Kontakta kunden om leverans eller hämtning, och uppdatera status när ni går vidare.
      </p>

      {loadFailed && (
        <p role="alert" style={{ background: "#3f1212", color: "#fca5a5", padding: "12px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          Beställningarna kunde inte hämtas. Ladda om sidan.
        </p>
      )}

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
        {FILTERS.map(f => (
          <button key={f.key} type="button" className="om-tab" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ position: "relative", maxWidth: 420 }}>
            <Search size={15} color={C.faint} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input className="om-input" type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Sök på ordernummer, kund, företag eller referens" aria-label="Sök beställningar" style={{ paddingLeft: 34 }} />
          </div>
        </div>

        {shown.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <ShoppingBag size={32} color="#333" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
              {orders.length === 0 ? "Inga beställningar än. De dyker upp här när kunderna beställer i kassan." : "Inga beställningar matchar."}
            </p>
          </div>
        ) : (
          <>
            <div className="om-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.deep, borderBottom: `1px solid ${C.border}` }}>
                    {["Order", "Datum", "Kund", "Betalning", "Status", "Totalt"].map(h => (
                      <th key={h} scope="col" style={{ textAlign: h === "Totalt" ? "right" : "left", padding: "11px 16px", color: C.faint, fontSize: 12, fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map(o => (
                    <tr key={o.id} className="om-row" tabIndex={0} onClick={() => setOpenId(o.id)}
                      onKeyDown={e => { if (e.key === "Enter") setOpenId(o.id); }}
                      style={{ borderBottom: "1px solid #1a1a1a" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>#{o.order_number}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: C.muted, whiteSpace: "nowrap" }}>{date(o.created_at)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>
                        <div style={{ fontWeight: 500 }}>{o.customer?.name || o.customer?.email}</div>
                        {o.customer?.foretag && <div style={{ fontSize: 12, color: C.faint }}>{o.customer.foretag}</div>}
                      </td>
                      <td style={{ padding: "12px 16px" }}><PayText o={o} /></td>
                      <td style={{ padding: "12px 16px" }}><StatusPill o={o} /></td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{formatKr(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="om-cards" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {shown.map(o => (
                <li key={o.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <button type="button" onClick={() => setOpenId(o.id)}
                    style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#fff", padding: 16, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <span style={{ fontWeight: 700 }}>#{o.order_number}</span>
                      <StatusPill o={o} />
                    </div>
                    <div style={{ fontSize: 14, marginTop: 6 }}>{o.customer?.name || o.customer?.email}{o.customer?.foretag ? ` · ${o.customer.foretag}` : ""}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: C.faint }}>{date(o.created_at)}</span>
                      <span style={{ fontWeight: 700 }}>{formatKr(o.total)}</span>
                    </div>
                    <div style={{ marginTop: 4 }}><PayText o={o} /></div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {open && <OrderDialog key={open.id} order={open} onClose={() => setOpenId(null)} />}
    </section>
  );
}

function OrderDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [payment, setPayment] = useState<PaymentStatus>(order.payment_status);
  const [note, setNote] = useState(order.admin_note ?? "");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const dirty = status !== order.status || payment !== order.payment_status || note.trim() !== (order.admin_note ?? "").trim();

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose, pending]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await updateOrder(order.id, { status, payment_status: payment, admin_note: note });
        if (!res.ok) { setMsg({ text: res.error, error: true }); return; }
        setMsg({ text: "Ändringarna är sparade." });
        router.refresh();
      } catch {
        setMsg({ text: "Ändringen kunde inte sparas. Ladda om sidan och försök igen.", error: true });
      }
    });
  }

  const c = order.customer ?? ({} as Order["customer"]);
  const address = [c.adress, [c.postnummer, c.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const label: React.CSSProperties = { fontSize: 12, color: C.faint, margin: "0 0 2px" };
  const section: React.CSSProperties = { padding: 20, borderTop: `1px solid ${C.border}` };

  return (
    <div onMouseDown={e => { if (e.target === e.currentTarget && !pending) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "5vh 12px", overflowY: "auto" }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="om-title"
        style={{ background: "#111", border: "1px solid #222", borderRadius: 14, width: "100%", maxWidth: 720, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "20px 20px 14px" }}>
          <div>
            <h2 id="om-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Beställning #{order.order_number}</h2>
            <p style={{ fontSize: 12, color: C.faint, margin: "4px 0 0" }}>{date(order.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Stäng"
            style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", padding: 6 }}><X size={18} /></button>
        </div>

        <div style={{ ...section, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, fontSize: 13 }}>
          <div><p style={label}>Kund</p><p style={{ margin: 0 }}>{c.name || "—"}{c.foretag ? <><br />{c.foretag}</> : null}{c.orgnr ? <><br /><span style={{ color: C.muted }}>Org.nr {c.orgnr}</span></> : null}</p></div>
          <div><p style={label}>Kontakt</p><p style={{ margin: 0 }}>
            {c.email && <a href={`mailto:${c.email}`} style={{ color: "#60a5fa" }}>{c.email}</a>}
            {c.telefon && <><br /><a href={`tel:${c.telefon.replace(/\s+/g, "")}`} style={{ color: "#60a5fa" }}>{c.telefon}</a></>}
          </p></div>
          <div><p style={label}>Adress</p><p style={{ margin: 0 }}>{address || "—"}</p></div>
          {order.reference && <div><p style={label}>Kundens referens</p><p style={{ margin: 0 }}>{order.reference}</p></div>}
        </div>

        {order.message && (
          <div style={section}>
            <p style={label}>Meddelande från kunden</p>
            <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-line", lineHeight: 1.5 }}>{order.message}</p>
          </div>
        )}

        <div style={section}>
          <p style={label}>Produkter</p>
          <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, fontSize: 13 }}>
            {order.items.map(i => (
              <li key={i.product_id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                <span style={{ minWidth: 0 }}>
                  <a href={`/produkt/${i.product_id}`} target="_blank" rel="noopener" style={{ color: "#fff", fontWeight: 600 }}>{i.name}</a>
                  <span style={{ display: "block", color: C.faint, fontSize: 12 }}>
                    {[i.sku, `${i.qty} st à ${formatKr(i.price)}`].filter(Boolean).join(" · ")}
                    {!i.in_stock && <span style={{ color: "#fbbf24" }}> · Ej i lager vid beställning</span>}
                  </span>
                </span>
                <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{formatKr(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <div style={{ fontSize: 13, marginTop: 10, display: "grid", gap: 4 }}>
            {order.discount_amount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}>
                <span>Kundrabatt ({formatPercent(Number(order.discount_percent))})</span><span>−{formatKr(order.discount_amount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700 }}>
              <span>Totalt (inkl. moms)</span><span>{formatKr(order.total)}</span>
            </div>
            <div style={{ color: C.muted }}>Betalning: {PAYMENT_METHOD[order.payment_method]}{order.paid_at ? ` · betald ${date(order.paid_at)}` : ""}</div>
          </div>
        </div>

        <form onSubmit={save} style={{ ...section, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <label style={{ fontSize: 12, color: C.muted }}>Status
              <select className="om-input" style={{ marginTop: 6 }} value={status} onChange={e => setStatus(e.target.value as OrderStatus)}>
                {(Object.keys(ORDER_STATUS) as OrderStatus[]).map(s => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: C.muted }}>Betalstatus
              <select className="om-input" style={{ marginTop: 6 }} value={payment} onChange={e => setPayment(e.target.value as PaymentStatus)}>
                {(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map(s => <option key={s} value={s}>{PAYMENT_STATUS[s]}</option>)}
              </select>
            </label>
          </div>
          <label style={{ fontSize: 12, color: C.muted }}>Intern anteckning (syns inte för kunden)
            <textarea className="om-input" rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ marginTop: 6, resize: "vertical", fontFamily: "inherit" }} />
          </label>
          {msg && <p role={msg.error ? "alert" : "status"} style={{ margin: 0, fontSize: 12, color: msg.error ? "#f87171" : "#4ade80" }}>{msg.text}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="om-btn om-ghost" onClick={onClose} disabled={pending}>Stäng</button>
            <button type="submit" className="om-btn om-primary" disabled={pending || !dirty}>{pending ? "Sparar…" : "Spara ändringar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
