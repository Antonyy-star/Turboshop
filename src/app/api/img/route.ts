import { NextRequest, NextResponse } from "next/server";

import { authHeader, API_UA } from "@/lib/turbocentras/api";

export const runtime = "nodejs";

// Proxies turbocentras.com product images using the PrestaShop API key.
// Usage: /api/img?u=<encoded-turbocentras-image-url>
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) return new NextResponse("Missing url", { status: 400 });

  let url: URL;
  try {
    url = new URL(decodeURIComponent(raw));
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (url.hostname !== "turbocentras.com" && !url.hostname.endsWith(".turbocentras.com")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const auth = authHeader().replace(/^Basic /, "");
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": API_UA,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return new NextResponse("Not found", { status: 404 });

    const buf = await res.arrayBuffer();
    const ct  = res.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buf, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}
