"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, UserPlus, X, Copy, Check, Eye, EyeOff, RefreshCw, Users,
  KeyRound, Ban, ShieldCheck, Trash2, Pencil,
} from "lucide-react";
import {
  createCustomer, updateCustomer, setCustomerPassword, setCustomerBlocked,
  deleteCustomer, type CustomerInput,
} from "@/app/admin/(dashboard)/customers/actions";
import { PASSWORD_MIN_LENGTH, passwordProblem } from "@/lib/auth/messages";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  telefon: string;
  foretag: string;
  orgnr: string;
  adress: string;
  postnummer: string;
  ort: string;
  anteckning: string;
  createdAt: string;
  lastSignInAt: string | null;
  status: "active" | "blocked";
};

type Credentials = { name: string; email: string; password: string; isNew: boolean };

// ── Colours (match the rest of the admin panel) ────────────────────────────
const C = {
  surface: "#141414",
  surfaceDeep: "#0f0f0f",
  field: "#1a1a1a",
  border: "#1f1f1f",
  borderStrong: "#2a2a2a",
  text: "#fff",
  muted: "#999",
  faint: "#666",
  red: "#dc2626",
  green: "#4ade80",
  amber: "#f59e0b",
};

const STATUS: Record<CustomerRow["status"], { label: string; fg: string; bg: string; hint: string }> = {
  active:   { label: "Aktiv",        fg: "#4ade80", bg: "#14532d", hint: "Kan logga in" },
  blocked:  { label: "Spärrad",      fg: "#f87171", bg: "#3f1212", hint: "Kan inte logga in" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}

// Unambiguous characters only (no 0/O, 1/l/I) so passwords can be read out loud.
function generatePassword(length = 14) {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const rand = (max: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  };
  for (;;) {
    let pw = "";
    for (let i = 0; i < length; i++) pw += all[rand(all.length)];
    if (/\d/.test(pw) && /[a-z]/i.test(pw)) return pw;
  }
}

function credentialsText(c: Credentials) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/logga-in` : "/logga-in";
  return `Inloggning till TurboTeknik\nAdress: ${url}\nE-post: ${c.email}\nLösenord: ${c.password}`;
}

// ── Shared UI pieces ───────────────────────────────────────────────────────

const STYLES = `
  .cm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: 8px;
    font-size: 13px; font-weight: 600; cursor: pointer; padding: 9px 16px; border: 1px solid transparent;
    transition: background .15s, border-color .15s, color .15s; white-space: nowrap; min-height: 38px; }
  .cm-btn:disabled { opacity: .55; cursor: not-allowed; }
  .cm-btn:focus-visible, .cm-input:focus-visible, .cm-icon:focus-visible, .cm-row-btn:focus-visible {
    outline: 2px solid #f87171; outline-offset: 2px; }
  .cm-primary { background: ${C.red}; color: #fff; }
  .cm-primary:hover:not(:disabled) { background: #b91c1c; }
  .cm-ghost { background: transparent; color: #ddd; border-color: ${C.borderStrong}; }
  .cm-ghost:hover:not(:disabled) { background: #1c1c1c; border-color: #3a3a3a; }
  .cm-danger { background: transparent; color: #f87171; border-color: #4a1d1d; }
  .cm-danger:hover:not(:disabled) { background: #2a1212; }
  .cm-danger-solid { background: #b91c1c; color: #fff; }
  .cm-danger-solid:hover:not(:disabled) { background: #991b1b; }
  .cm-input { width: 100%; background: ${C.field}; border: 1px solid ${C.borderStrong}; border-radius: 7px;
    padding: 9px 12px; color: #fff; font-size: 13px; box-sizing: border-box; min-height: 38px; }
  .cm-input:focus { border-color: #555; outline: none; }
  .cm-input[aria-invalid="true"] { border-color: #7f1d1d; }
  .cm-icon { background: none; border: none; color: ${C.faint}; cursor: pointer; padding: 6px; border-radius: 6px;
    display: inline-flex; align-items: center; justify-content: center; }
  .cm-icon:hover { color: #fff; background: #1f1f1f; }
  .cm-row:hover { background: #171717; }
  .cm-row-btn { background: #1c1c1c; border: 1px solid ${C.borderStrong}; color: #ddd; border-radius: 7px;
    padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
  .cm-row-btn:hover { background: #242424; color: #fff; }
  .cm-row-del { color: #f87171; }
  .cm-row-del:hover { background: #2a1212; border-color: #4a1d1d; color: #fca5a5; }
  .cm-section + .cm-section { border-top: 1px solid ${C.border}; }
  .cm-cards { display: none; }
  @media (max-width: 700px) {
    .cm-table { display: none; }
    .cm-cards { display: block; }
  }
  @media (max-width: 640px) {
    .cm-head { flex-direction: column; align-items: stretch !important; }
    .cm-grid2 { grid-template-columns: 1fr !important; }
    .cm-hide-sm { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { .cm-btn { transition: none; } }
`;

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: C.faint, margin: "6px 0 0" }}>{hint}</p>}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p role="alert" style={{ color: "#f87171", fontSize: 12, margin: 0, lineHeight: 1.45 }}>{children}</p>;
}

function Modal({ title, subtitle, onClose, children, busy }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; busy?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>("input, textarea, button:not([data-close])");
    first?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  return (
    <div
      onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 1000,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "6vh 16px", overflowY: "auto",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-dialog-title"
        style={{
          background: "#111", border: "1px solid #222", borderRadius: 14,
          width: "100%", maxWidth: 560, boxShadow: "0 24px 60px rgba(0,0,0,.55)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "22px 24px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ minWidth: 0 }}>
            <h2 id="cm-dialog-title" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 12, color: C.faint, margin: "4px 0 0", overflowWrap: "anywhere" }}>{subtitle}</p>}
          </div>
          <button data-close type="button" className="cm-icon" onClick={onClose} disabled={busy} aria-label="Stäng">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ id, value, onChange, invalid }: {
  id: string; value: string; onChange: (v: string) => void; invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ position: "relative", flex: 1 }}>
        <input
          id={id}
          className="cm-input"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          style={{ paddingRight: 38, fontFamily: visible && value ? "ui-monospace, Menlo, Consolas, monospace" : undefined }}
        />
        <button
          type="button"
          className="cm-icon"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? "Dölj lösenord" : "Visa lösenord"}
          style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <button
        type="button"
        className="cm-btn cm-ghost"
        onClick={() => { onChange(generatePassword()); setVisible(true); }}
        title="Skapa ett slumpat lösenord"
      >
        <RefreshCw size={14} /> Slumpa
      </button>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button type="button" className="cm-btn cm-primary" onClick={copy} style={{ width: "100%" }}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? "Kopierat" : label}
    </button>
  );
}

// Shown once after creating a customer or setting a new password.
function CredentialsPanel({ creds, onDone }: { creds: Credentials; onDone: () => void }) {
  const rows: [string, string][] = [
    ["E-post", creds.email],
    ["Lösenord", creds.password],
  ];
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#14532d", color: C.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Check size={18} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            {creds.isNew ? `Kontot för ${creds.name} är skapat` : `Nytt lösenord sparat för ${creds.name}`}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Lösenordet visas bara nu. Skicka uppgifterna till kunden, till exempel via sms eller telefon.
          </p>
        </div>
      </div>

      <dl style={{ margin: 0, background: C.surfaceDeep, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{ display: "flex", gap: 12, padding: "11px 14px", borderTop: i ? `1px solid ${C.border}` : "none" }}>
            <dt style={{ width: 70, flexShrink: 0, fontSize: 12, color: C.faint }}>{k}</dt>
            <dd style={{ margin: 0, fontSize: 13, fontFamily: "ui-monospace, Menlo, Consolas, monospace", overflowWrap: "anywhere" }}>{v}</dd>
          </div>
        ))}
      </dl>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <CopyButton text={credentialsText(creds)} label="Kopiera inloggningsuppgifter" />
        <button type="button" className="cm-btn cm-ghost" onClick={onDone}>Klar</button>
      </div>
    </div>
  );
}

// ── Create customer ────────────────────────────────────────────────────────

const DETAIL_KEYS = ["name", "email", "telefon", "foretag", "orgnr", "adress", "postnummer", "ort", "anteckning"] as const;

const EMPTY: CustomerInput = {
  name: "", email: "", telefon: "", foretag: "", orgnr: "", adress: "", postnummer: "", ort: "", anteckning: "",
};

function detailsOf(c: CustomerRow): CustomerInput {
  return Object.fromEntries(DETAIL_KEYS.map(k => [k, c[k] ?? ""])) as CustomerInput;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "6px 0 -4px", fontSize: 12, fontWeight: 600, color: "#ccc" }}>{children}</p>;
}

function DetailsFields({ value, onChange, idPrefix }: {
  value: CustomerInput; onChange: (v: CustomerInput) => void; idPrefix: string;
}) {
  const set = (k: keyof CustomerInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...value, [k]: e.target.value });
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <>
      <GroupLabel>Kontakt</GroupLabel>
      <Field label="Namn" htmlFor={id("name")}>
        <input id={id("name")} className="cm-input" value={value.name} onChange={set("name")} autoComplete="off" required />
      </Field>
      <div className="cm-grid2" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
        <Field label="E-post" htmlFor={id("email")} hint="Kunden loggar in med den här adressen.">
          <input id={id("email")} className="cm-input" type="email" value={value.email} onChange={set("email")} autoComplete="off" required />
        </Field>
        <Field label="Telefon" htmlFor={id("tel")}>
          <input id={id("tel")} className="cm-input" type="tel" value={value.telefon} onChange={set("telefon")} autoComplete="off" />
        </Field>
      </div>

      <GroupLabel>Företag</GroupLabel>
      <div className="cm-grid2" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
        <Field label="Företagsnamn" htmlFor={id("company")}>
          <input id={id("company")} className="cm-input" value={value.foretag} onChange={set("foretag")} autoComplete="off" />
        </Field>
        <Field label="Organisationsnummer" htmlFor={id("orgnr")}>
          <input id={id("orgnr")} className="cm-input" inputMode="numeric" placeholder="556677-8899" value={value.orgnr} onChange={set("orgnr")} autoComplete="off" />
        </Field>
      </div>

      <GroupLabel>Adress</GroupLabel>
      <Field label="Gatuadress" htmlFor={id("adress")}>
        <input id={id("adress")} className="cm-input" value={value.adress} onChange={set("adress")} autoComplete="off" />
      </Field>
      <div className="cm-grid2" style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 14 }}>
        <Field label="Postnummer" htmlFor={id("postnr")}>
          <input id={id("postnr")} className="cm-input" inputMode="numeric" placeholder="123 45" value={value.postnummer} onChange={set("postnummer")} autoComplete="off" />
        </Field>
        <Field label="Ort" htmlFor={id("ort")}>
          <input id={id("ort")} className="cm-input" value={value.ort} onChange={set("ort")} autoComplete="off" />
        </Field>
      </div>

      <GroupLabel>Intern anteckning</GroupLabel>
      <Field label="Syns bara för admins, aldrig för kunden" htmlFor={id("note")}>
        <textarea id={id("note")} className="cm-input" rows={3} value={value.anteckning} onChange={set("anteckning")}
          style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
      </Field>
    </>
  );
}

function DeleteCustomerDialog({ customer, onClose, onDeleted }: {
  customer: CustomerRow; onClose: () => void; onDeleted: () => void;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError("");
    startTransition(async () => {
      try {
        const res = await deleteCustomer(customer.id);
        if (!res.ok) { setError(res.error); return; }
        onDeleted();
        onClose();
      } catch {
        setError("Kontot kunde inte tas bort. Ladda om sidan och försök igen.");
      }
    });
  }

  return (
    <Modal title="Ta bort kund" subtitle={customer.email} onClose={onClose} busy={pending}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#ddd" }}>
          Kontot för <strong style={{ color: "#fff" }}>{customer.name}</strong> raderas permanent. Kunden kan inte
          längre logga in och alla uppgifter försvinner. Det går inte att ångra.
        </p>
        <ErrorText>{error}</ErrorText>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="cm-btn cm-ghost" onClick={onClose} disabled={pending}>Avbryt</button>
          <button type="button" className="cm-btn cm-danger-solid" onClick={confirm} disabled={pending}>
            <Trash2 size={14} /> {pending ? "Tar bort..." : "Ta bort permanent"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreateCustomerDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [details, setDetails] = useState<CustomerInput>(EMPTY);
  const [password, setPassword] = useState(() => generatePassword());
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pwProblem = passwordProblem(password);
    if (pwProblem) { setError(pwProblem); return; }
    startTransition(async () => {
      try {
        const res = await createCustomer(details, password);
        if (!res.ok) { setError(res.error); return; }
        setCreds({ name: details.name.trim(), email: details.email.trim().toLowerCase(), password, isNew: true });
        onCreated();
      } catch {
        setError("Kontot kunde inte skapas. Kontrollera att du är inloggad som admin och försök igen.");
      }
    });
  }

  return (
    <Modal
      title={creds ? "Kund skapad" : "Skapa kundkonto"}
      subtitle={creds ? undefined : "Kunden kan logga in direkt med e-post och lösenord."}
      onClose={onClose}
      busy={pending}
    >
      {creds ? (
        <CredentialsPanel creds={creds} onDone={onClose} />
      ) : (
        <form onSubmit={submit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <DetailsFields value={details} onChange={setDetails} idPrefix="new" />
          <Field label="Lösenord" htmlFor="new-password" hint={`Minst ${PASSWORD_MIN_LENGTH} tecken med både bokstäver och siffror.`}>
            <PasswordInput id="new-password" value={password} onChange={setPassword} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="cm-btn cm-ghost" onClick={onClose} disabled={pending}>Avbryt</button>
            <button type="submit" className="cm-btn cm-primary" disabled={pending}>
              {pending ? "Skapar konto..." : "Skapa konto"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ── Manage existing customer ───────────────────────────────────────────────

function SectionTitle({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>{icon}{title}</h3>
      {text && <p style={{ fontSize: 12, color: C.faint, margin: "4px 0 0", lineHeight: 1.5 }}>{text}</p>}
    </div>
  );
}

function ManageCustomerDialog({ customer, onClose, onChanged }: {
  customer: CustomerRow; onClose: () => void; onChanged: () => void;
}) {
  const [details, setDetails] = useState<CustomerInput>(() => detailsOf(customer));
  const [password, setPassword] = useState("");
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<{ section: string; text: string; error?: boolean } | null>(null);
  const [busySection, setBusySection] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const saved = detailsOf(customer);
  const dirty = DETAIL_KEYS.some(k => details[k].trim() !== saved[k].trim());

  function run(section: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string, after?: () => void) {
    setNotice(null);
    setBusySection(section);
    startTransition(async () => {
      try {
        const res = await action();
        if (!res.ok) { setNotice({ section, text: res.error, error: true }); return; }
        setNotice({ section, text: success });
        onChanged();
        after?.();
      } catch {
        setNotice({ section, text: "Åtgärden misslyckades. Ladda om sidan och försök igen.", error: true });
      } finally {
        setBusySection(null);
      }
    });
  }

  function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    run("details", () => updateCustomer(customer.id, details), "Uppgifterna är sparade.");
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) { setNotice({ section: "password", text: problem, error: true }); return; }
    run("password", () => setCustomerPassword(customer.id, password), "", () =>
      setCreds({ name: details.name || customer.name, email: details.email || customer.email, password, isNew: false })
    );
  }

  const busy = pending;
  const noticeFor = (section: string) =>
    notice?.section === section ? (
      notice.error
        ? <ErrorText>{notice.text}</ErrorText>
        : notice.text ? <p role="status" style={{ color: C.green, fontSize: 12, margin: 0 }}>{notice.text}</p> : null
    ) : null;

  if (creds) {
    return (
      <Modal title="Nytt lösenord" onClose={onClose}>
        <CredentialsPanel creds={creds} onDone={onClose} />
      </Modal>
    );
  }

  const status = STATUS[customer.status];

  return (
    <Modal title={customer.name} subtitle={customer.email} onClose={onClose} busy={busy}>
      {/* Status summary */}
      <div style={{ padding: "14px 24px", display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 12, color: C.muted, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ color: status.fg }}>{status.label}</span>
        <span>Skapad {formatDate(customer.createdAt)}</span>
        <span>{customer.lastSignInAt ? `Senast inloggad ${formatDate(customer.lastSignInAt)}` : "Har inte loggat in än"}</span>
      </div>

      {/* Details */}
      <form className="cm-section" onSubmit={saveDetails} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <SectionTitle icon={<Users size={15} color={C.muted} />} title="Uppgifter" />
        <DetailsFields value={details} onChange={setDetails} idPrefix="edit" />
        {noticeFor("details")}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="cm-btn cm-primary" disabled={busy || !dirty}>
            {busySection === "details" ? "Sparar..." : "Spara ändringar"}
          </button>
        </div>
      </form>

      {/* Password */}
      <form className="cm-section" onSubmit={savePassword} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <SectionTitle
          icon={<KeyRound size={15} color={C.muted} />}
          title="Nytt lösenord"
          text="Använd om kunden har glömt sitt lösenord. Det gamla slutar gälla direkt."
        />
        <PasswordInput id="edit-password" value={password} onChange={setPassword} />
        {noticeFor("password")}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="cm-btn cm-ghost" disabled={busy || !password}>
            {busySection === "password" ? "Sparar..." : "Spara lösenord"}
          </button>
        </div>
      </form>

      {/* Access */}
      <div className="cm-section" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        {customer.status === "blocked" ? (
          <>
            <SectionTitle
              icon={<ShieldCheck size={15} color={C.muted} />}
              title="Kontot är spärrat"
              text="Kunden kan inte logga in. Häv spärren för att ge åtkomst igen."
            />
            {noticeFor("access")}
            <div>
              <button type="button" className="cm-btn cm-ghost" disabled={busy}
                onClick={() => run("access", () => setCustomerBlocked(customer.id, false), "Spärren är hävd.")}>
                <ShieldCheck size={14} /> {busySection === "access" ? "Häver spärr..." : "Häv spärr"}
              </button>
            </div>
          </>
        ) : (
          <>
            <SectionTitle
              icon={<Ban size={15} color={C.muted} />}
              title="Spärra konto"
              text="Kunden loggas ut och kan inte logga in förrän du häver spärren. Uppgifterna sparas."
            />
            {noticeFor("access")}
            <div>
              <button type="button" className="cm-btn cm-ghost" disabled={busy}
                onClick={() => run("access", () => setCustomerBlocked(customer.id, true), "Kontot är spärrat.")}>
                <Ban size={14} /> {busySection === "access" ? "Spärrar..." : "Spärra konto"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete */}
      <div className="cm-section" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <SectionTitle
          icon={<Trash2 size={15} color="#f87171" />}
          title="Ta bort konto"
          text="Kontot och inloggningen raderas permanent. Det går inte att ångra."
        />
        {noticeFor("delete")}
        {confirmDelete ? (
          <div style={{ background: "#1a0e0e", border: "1px solid #4a1d1d", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              Ta bort kontot för <strong>{customer.name}</strong> permanent?
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="cm-btn cm-danger-solid" disabled={busy}
                onClick={() => run("delete", () => deleteCustomer(customer.id), "", onClose)}>
                {busySection === "delete" ? "Tar bort..." : "Ta bort permanent"}
              </button>
              <button type="button" className="cm-btn cm-ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>Avbryt</button>
            </div>
          </div>
        ) : (
          <div>
            <button type="button" className="cm-btn cm-danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Ta bort konto
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main list ──────────────────────────────────────────────────────────────

export default function CustomersManager({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const managing = customers.find(c => c.id === managingId) ?? null;
  const deleting = customers.find(c => c.id === deletingId) ?? null;
  const refresh = () => router.refresh();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      [c.name, c.email, c.foretag, c.telefon, c.orgnr, c.ort].some(v => v.toLowerCase().includes(q))
    );
  }, [customers, query]);


  return (
    <section aria-labelledby="customers-title" style={{ marginBottom: 40 }}>
      <style>{STYLES}</style>

      <div className="cm-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 id="customers-title" style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Kunder</h1>
          <p style={{ color: C.faint, fontSize: 14, margin: 0, maxWidth: 520, lineHeight: 1.5 }}>
            Kunder kan inte registrera sig själva. Skapa ett konto här och ge kunden inloggningsuppgifterna.
          </p>
        </div>
        <button type="button" className="cm-btn cm-primary" onClick={() => setCreating(true)}>
          <UserPlus size={15} /> Skapa kund
        </button>
      </div>

      {customers.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "56px 24px", textAlign: "center" }}>
          <Users size={36} color="#333" style={{ margin: "0 auto 14px" }} />
          <p style={{ color: "#bbb", fontSize: 15, margin: "0 0 6px" }}>Inga kundkonton än</p>
          <p style={{ color: C.faint, fontSize: 13, margin: "0 0 18px" }}>Skapa det första kontot så kan kunden logga in på hemsidan.</p>
          <button type="button" className="cm-btn cm-primary" onClick={() => setCreating(true)}>
            <UserPlus size={15} /> Skapa kund
          </button>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
              <Search size={15} color={C.faint} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                className="cm-input"
                type="search"
                placeholder="Sök på namn, e-post, företag eller telefon"
                aria-label="Sök kunder"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
            <span style={{ fontSize: 12, color: C.faint }}>
              {filtered.length === customers.length
                ? `${customers.length} ${customers.length === 1 ? "konto" : "konton"}`
                : `${filtered.length} av ${customers.length}`}
            </span>
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: C.faint, fontSize: 13, textAlign: "center", padding: "36px 16px", margin: 0 }}>
              Ingen kund matchar ”{query}”.
            </p>
          ) : (
            <>
            {/* Phones: one card per customer, with the actions always visible */}
            <ul className="cm-cards" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {filtered.map((c, idx) => {
                const s = STATUS[c.status];
                return (
                  <li key={c.id} style={{ padding: 16, borderBottom: idx < filtered.length - 1 ? "1px solid #1a1a1a" : "none" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div aria-hidden style={{
                        width: 38, height: 38, borderRadius: "50%", background: "#1f1f1f", border: "1px solid #2a2a2a",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: C.red, flexShrink: 0,
                      }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</span>
                          <span title={s.hint} style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20 }}>
                            {s.label}
                          </span>
                        </div>
                        {c.foretag && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.foretag}</div>}
                        <a href={`mailto:${c.email}`} style={{ display: "block", fontSize: 13, color: "#60a5fa", textDecoration: "none", marginTop: 6, overflowWrap: "anywhere" }}>
                          {c.email}
                        </a>
                        <div style={{ fontSize: 12, color: C.faint, marginTop: 4, display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>
                          {c.telefon && <a href={`tel:${c.telefon.replace(/\s+/g, "")}`} style={{ color: C.muted, textDecoration: "none" }}>{c.telefon}</a>}
                          <span>{c.lastSignInAt ? `Senast inloggad ${formatDate(c.lastSignInAt)}` : "Har inte loggat in än"}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button type="button" className="cm-btn cm-ghost" onClick={() => setManagingId(c.id)} style={{ flex: 1 }}>
                        <Pencil size={14} /> Redigera
                      </button>
                      <button type="button" className="cm-btn cm-danger" onClick={() => setDeletingId(c.id)} aria-label={`Ta bort ${c.name}`}>
                        <Trash2 size={14} /> Ta bort
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="cm-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ background: C.surfaceDeep, borderBottom: `1px solid ${C.border}` }}>
                    {[
                      { h: "Kund" }, { h: "E-post" }, { h: "Telefon", cls: "cm-hide-sm" },
                      { h: "Status" }, { h: "Senast inloggad", cls: "cm-hide-sm" }, { h: "" },
                    ].map(({ h, cls }, i) => (
                      <th key={i} className={cls} scope="col" style={{ textAlign: "left", padding: "11px 16px", color: C.faint, fontSize: 12, fontWeight: 500 }}>
                        {h || <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Åtgärder</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => {
                    const s = STATUS[c.status];
                    return (
                      <tr key={c.id} className="cm-row" style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #1a1a1a" : "none" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div aria-hidden style={{
                              width: 34, height: 34, borderRadius: "50%", background: "#1f1f1f", border: "1px solid #2a2a2a",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 12, fontWeight: 700, color: C.red, flexShrink: 0,
                            }}>
                              {initials(c.name)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                              {c.foretag && <div style={{ fontSize: 12, color: C.faint }}>{c.foretag}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>
                          <a href={`mailto:${c.email}`} style={{ color: "#60a5fa", textDecoration: "none" }}>{c.email}</a>
                        </td>
                        <td className="cm-hide-sm" style={{ padding: "12px 16px", fontSize: 13, color: C.muted }}>{c.telefon || "—"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span title={s.hint} style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                            {s.label}
                          </span>
                        </td>
                        <td className="cm-hide-sm" style={{ padding: "12px 16px", fontSize: 13, color: c.lastSignInAt ? C.muted : "#555" }}>
                          {formatDate(c.lastSignInAt) ?? "Aldrig"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                            <button type="button" className="cm-row-btn" onClick={() => setManagingId(c.id)} aria-label={`Redigera ${c.name}`}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <Pencil size={13} /> Redigera
                            </button>
                            <button type="button" className="cm-row-btn cm-row-del" onClick={() => setDeletingId(c.id)}
                              aria-label={`Ta bort ${c.name}`} title="Ta bort kund"
                              style={{ display: "inline-flex", alignItems: "center", padding: "6px 8px" }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {creating && <CreateCustomerDialog onClose={() => setCreating(false)} onCreated={refresh} />}
      {managing && (
        <ManageCustomerDialog
          key={managing.id}
          customer={managing}
          onClose={() => setManagingId(null)}
          onChanged={refresh}
        />
      )}
      {deleting && (
        <DeleteCustomerDialog
          key={deleting.id}
          customer={deleting}
          onClose={() => setDeletingId(null)}
          onDeleted={refresh}
        />
      )}
    </section>
  );
}
