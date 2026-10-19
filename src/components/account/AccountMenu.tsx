"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { signInAccount } from "@/lib/auth/signIn";

export type AccountState =
  | { status: "loading" | "out" }
  | { status: "customer" | "admin"; name: string; email: string };

function toState(user: User | null | undefined): AccountState {
  if (!user) return { status: "out" };
  const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const email = user.email ?? "";
  return user.app_metadata?.role === "admin"
    ? { status: "admin", name, email }
    : { status: "customer", name, email };
}

// Cosmetic only: decides what the header shows. Access is enforced on the server.
export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>({ status: "loading" });
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setState(toState(data.session?.user)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setState(toState(session?.user)));
    return () => sub.subscription.unsubscribe();
  }, []);
  return state;
}

export function accountLink(state: AccountState): { href: string; label: string } {
  if (state.status === "admin") return { href: "/admin", label: "Adminpanel" };
  if (state.status === "customer") return { href: "/konto", label: "Mitt konto" };
  return { href: "/logga-in", label: "Logga in" };
}

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black bg-white " +
  "focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors";

function PersonIcon() {
  return (
    <svg className="w-6 h-6" fill="black" stroke="black" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function SignInPanel({ onSignedIn }: { onSignedIn: (type: "customer" | "admin") => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => { emailRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const result = await signInAccount(email, password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    onSignedIn(result.type);
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div>
        <p className="text-base font-black text-black">Logga in</p>
        <p className="mt-0.5 text-xs text-gray-500">Med kontot du har fått av TurboTeknik.</p>
      </div>

      <div>
        <label htmlFor={`${id}-email`} className="block text-xs font-medium text-gray-700 mb-1">E-postadress</label>
        <input
          ref={emailRef}
          id={`${id}-email`}
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={inputClass}
          aria-invalid={error ? true : undefined}
        />
      </div>

      <div>
        <label htmlFor={`${id}-password`} className="block text-xs font-medium text-gray-700 mb-1">Lösenord</label>
        <div className="relative">
          <input
            id={`${id}-password`}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={`${inputClass} pr-14`}
            aria-invalid={error ? true : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-gray-500 hover:text-black rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
          >
            {showPassword ? "Dölj" : "Visa"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 leading-relaxed">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-md transition text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
      >
        {loading ? "Loggar in..." : "Logga in"}
      </button>

      <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
        <p>
          Glömt lösenordet?{" "}
          <Link href="/kontakt" className="text-red-600 font-medium hover:text-red-700">Kontakta oss</Link>
        </p>
        <p>
          Vill du bli kund?{" "}
          <Link href="/kontakt" className="text-red-600 font-medium hover:text-red-700">Hör av dig</Link>
        </p>
      </div>
    </form>
  );
}

function SignedInPanel({ state, onNavigate, onSignOut, signingOut }: {
  state: Extract<AccountState, { name: string }>;
  onNavigate: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const link = accountLink(state);
  const itemClass =
    "block w-full text-left px-5 py-2.5 text-sm text-black hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50";
  return (
    <div>
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <p className="text-xs text-gray-500">Inloggad som</p>
        <p className="mt-0.5 text-sm font-bold text-black truncate">{state.name}</p>
        <p className="text-xs text-gray-500 truncate">{state.email}</p>
      </div>
      <div className="py-2">
        <Link href={link.href} onClick={onNavigate} className={itemClass}>{link.label}</Link>
        <button type="button" onClick={onSignOut} disabled={signingOut} className={`${itemClass} disabled:opacity-60`}>
          {signingOut ? "Loggar ut..." : "Logga ut"}
        </button>
      </div>
    </div>
  );
}

export default function AccountMenu({ account, mounted }: { account: AccountState; mounted: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const link = accountLink(account);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleSignedIn(type: "customer" | "admin") {
    setOpen(false);
    if (type === "admin") router.push("/admin");
    router.refresh();
  }

  async function handleSignOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    setSigningOut(false);
    setOpen(false);
    if (pathname.startsWith("/konto")) router.replace("/logga-in?status=utloggad");
    router.refresh();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={link.label}
        title={link.label}
        className="flex items-center gap-1.5 p-1 text-black hover:opacity-70 transition rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
      >
        <PersonIcon />
        {mounted && <span className="hidden lg:inline text-sm font-medium whitespace-nowrap">{link.label}</span>}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={account.status === "customer" || account.status === "admin" ? "Ditt konto" : "Logga in"}
          className="z-[60] bg-white border border-gray-200 rounded-lg shadow-xl max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-16 sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-80"
        >
          {account.status === "customer" || account.status === "admin" ? (
            <SignedInPanel
              state={account}
              onNavigate={() => setOpen(false)}
              onSignOut={handleSignOut}
              signingOut={signingOut}
            />
          ) : (
            <SignInPanel onSignedIn={handleSignedIn} />
          )}
        </div>
      )}
    </div>
  );
}
