"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PASSWORD_MIN_LENGTH, passwordProblem, passwordUpdateErrorMessage, signInErrorMessage } from "@/lib/auth/messages";

const inputClass =
  "w-full border border-gray-300 rounded-md px-4 py-2.5 text-sm text-black bg-white " +
  "focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors";

export default function ChangePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess(false);

    const problem = passwordProblem(next);
    if (problem) { setError(problem); return; }
    if (next !== repeat) { setError("De nya lösenorden matchar inte."); return; }
    if (next === current) { setError("Det nya lösenordet måste skilja sig från det nuvarande."); return; }

    setLoading(true);
    const supabase = createClient();

    // Confirm the current password before changing it.
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (verifyError) {
      const msg = signInErrorMessage(verifyError);
      setError(msg === "Fel e-post eller lösenord." ? "Nuvarande lösenord stämmer inte." : msg);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    if (updateError) {
      setError(passwordUpdateErrorMessage(updateError));
      setLoading(false);
      return;
    }

    setCurrent(""); setNext(""); setRepeat("");
    setSuccess(true);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {/* Lets password managers attach the new password to the right account */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <div>
        <label htmlFor="pw-current" className="block text-sm font-medium text-gray-700 mb-1">Nuvarande lösenord</label>
        <input id="pw-current" type="password" autoComplete="current-password" required
          value={current} onChange={e => setCurrent(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="pw-new" className="block text-sm font-medium text-gray-700 mb-1">Nytt lösenord</label>
        <input id="pw-new" type="password" autoComplete="new-password" required aria-describedby="pw-rules"
          value={next} onChange={e => setNext(e.target.value)} className={inputClass} />
        <p id="pw-rules" className="mt-1 text-xs text-gray-500">
          Minst {PASSWORD_MIN_LENGTH} tecken med både bokstäver och siffror.
        </p>
      </div>
      <div>
        <label htmlFor="pw-repeat" className="block text-sm font-medium text-gray-700 mb-1">Upprepa nytt lösenord</label>
        <input id="pw-repeat" type="password" autoComplete="new-password" required
          value={repeat} onChange={e => setRepeat(e.target.value)} className={inputClass} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">{error}</p>
      )}
      {success && (
        <p role="status" className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-4 py-3">
          Lösenordet är bytt. Använd det nya nästa gång du loggar in.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-black hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
      >
        {loading ? "Sparar..." : "Byt lösenord"}
      </button>
    </form>
  );
}
