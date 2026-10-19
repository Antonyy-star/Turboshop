"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAccountType } from "@/app/actions/auth";
import { signInErrorMessage } from "@/lib/auth/messages";

const inputClass =
  "w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm text-black bg-white " +
  "focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors";

export default function LoginForm({ next, notice, signOutFirst }: {
  next: string;
  notice: string | null;
  signOutFirst: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // An account without customer access was sent here; end that session.
  useEffect(() => {
    if (signOutFirst) createClient().auth.signOut();
  }, [signOutFirst]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInError) {
      setError(signInErrorMessage(signInError));
      setLoading(false);
      return;
    }

    const type = await getAccountType().catch(() => "none" as const);
    if (type === "customer") {
      router.replace(next);
      router.refresh();
      return;
    }
    if (type === "admin") {
      router.replace("/admin");
      router.refresh();
      return;
    }

    await supabase.auth.signOut();
    setError("Kontot är inte aktiverat för inloggning än. Kontakta oss så hjälper vi dig.");
    setPassword("");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {notice && !error && (
        <p role="status" className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-md px-4 py-3">
          {notice}
        </p>
      )}

      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">E-postadress</label>
        <input
          id="login-email"
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
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Lösenord</label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={`${inputClass} pr-16`}
            aria-invalid={error ? true : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-black rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-label={showPassword ? "Dölj lösenord" : "Visa lösenord"}
          >
            {showPassword ? "Dölj" : "Visa"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-md transition text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
      >
        {loading ? "Loggar in..." : "Logga in"}
      </button>

      <p className="text-xs text-gray-500 leading-relaxed">
        Glömt lösenordet?{" "}
        <Link href="/kontakt" className="text-red-600 font-medium hover:text-red-700">Kontakta oss</Link>{" "}
        så sätter vi ett nytt åt dig.
      </p>
    </form>
  );
}
