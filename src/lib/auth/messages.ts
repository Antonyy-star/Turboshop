// Turns Supabase Auth errors into short Swedish messages that say what to do next.
export function signInErrorMessage(error: { message?: string; code?: string; status?: number }): string {
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  if (code === "user_banned" || msg.includes("banned")) {
    return "Kontot är spärrat. Kontakta oss om du behöver hjälp.";
  }
  if (code === "over_request_rate_limit" || error.status === 429 || msg.includes("rate limit")) {
    return "För många inloggningsförsök. Vänta några minuter och försök igen.";
  }
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "Fel e-post eller lösenord.";
  }
  if (msg.includes("fetch") || msg.includes("network")) {
    return "Kunde inte nå servern. Kontrollera din anslutning och försök igen.";
  }
  return "Inloggningen misslyckades. Försök igen.";
}

export const PASSWORD_MIN_LENGTH = 10;

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Lösenordet måste vara minst ${PASSWORD_MIN_LENGTH} tecken.`;
  if (password.length > 72) return "Lösenordet får vara högst 72 tecken.";
  if (!/[a-zåäö]/i.test(password) || !/\d/.test(password)) return "Lösenordet måste innehålla både bokstäver och siffror.";
  return null;
}

export function passwordUpdateErrorMessage(error: { message?: string; code?: string }): string {
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  if (code === "same_password" || msg.includes("different from the old")) return "Det nya lösenordet måste skilja sig från det gamla.";
  if (code === "weak_password" || msg.includes("weak") || msg.includes("pwned")) return "Lösenordet är för svagt eller har förekommit i en dataläcka. Välj ett annat.";
  if (msg.includes("at least")) return "Lösenordet är för kort.";
  return "Lösenordet kunde inte sparas. Försök igen.";
}
