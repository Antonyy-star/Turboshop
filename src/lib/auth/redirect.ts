// Only allow same-site paths as a post-login destination (no open redirects).
export function safeNextPath(next: unknown, fallback = "/konto"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/admin") || next.startsWith("/logga-in")) return fallback;
  return next;
}
