// Shared helpers for the Turbocentras PrestaShop webservice.
// Their firewall blocks unknown user agents, so every request must send "PsWs ...".
export const API_BASE = "https://turbocentras.com/api";
export const API_UA = "PsWs TurboTeknik";

// The key lives in .env.local / Vercel env (TURBOCENTRAS_API_KEY), never in the code: the repo is public.
export function apiKey() {
  const key = process.env.TURBOCENTRAS_API_KEY;
  if (!key) throw new Error("TURBOCENTRAS_API_KEY is not set");
  return key;
}
export const authHeader = () => `Basic ${Buffer.from(`${apiKey()}:`).toString("base64")}`;
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function api(path: string): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/${path}`, {
        headers: { Authorization: authHeader(), "User-Agent": API_UA },
        cache: "no-store",
      });
      if (res.ok) return res.text();
      if (res.status === 401 || res.status === 403) throw new Error(`Turbocentras refused access (${res.status})`);
    } catch (e) {
      if ((e as Error).message.includes("refused access")) throw e;
    }
    await sleep(3000 * attempt);
  }
  throw new Error(`Turbocentras API failed: ${path.slice(0, 80)}`);
}

/** Value of a simple <tag><![CDATA[...]]></tag> field. The tag name must match
 *  exactly: <id_turbo> must not match <id_turbo_number_type>. */
export const cdata = (block: string, tag: string) =>
  block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`))?.[1]?.trim() ?? "";

/** English (language 1) value of a multilingual field, falling back to the first language. */
export const lang = (block: string, tag: string) => {
  const inner = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? "";
  return (inner.match(/<language id="1"[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1]
    ?? inner.match(/<language[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? "").trim();
};

/** Splits a list response into top-level records (ignores nested association refs). */
export const records = (xml: string, tag: string) =>
  xml.split(new RegExp(`<${tag}>\\s*(?=<id><!\\[CDATA\\[)`)).slice(1);

/** Map of id -> English name for small lookup resources. */
export async function nameTable(resource: string, tag: string, field = "name") {
  const map: Record<string, string> = {};
  for (const b of records(await api(`${resource}?display=full`), tag)) map[cdata(b, "id")] = lang(b, field);
  return map;
}
