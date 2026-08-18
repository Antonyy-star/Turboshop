import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const BUCKET = "product-images";
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f3f4f6"/>
  <circle cx="100" cy="100" r="45" stroke="#d1d5db" stroke-width="8" fill="none"/>
  <circle cx="100" cy="100" r="15" fill="#d1d5db"/>
  <line x1="100" y1="40" x2="100" y2="55" stroke="#d1d5db" stroke-width="7" stroke-linecap="round"/>
  <line x1="100" y1="145" x2="100" y2="160" stroke="#d1d5db" stroke-width="7" stroke-linecap="round"/>
  <line x1="40" y1="100" x2="55" y2="100" stroke="#d1d5db" stroke-width="7" stroke-linecap="round"/>
  <line x1="145" y1="100" x2="160" y2="100" stroke="#d1d5db" stroke-width="7" stroke-linecap="round"/>
</svg>`;

export const runtime = "nodejs";
// Cache responses at edge for 24h
export const revalidate = 86400;

function storagePath(originalUrl: string): string {
  // tc/9581-thickbox_default/cartridge-ih-00-0008.jpg
  const without = originalUrl.replace("https://turbocentras.com/", "").replace("http://turbocentras.com/", "");
  return `tc/${without}`;
}

function placeholder() {
  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("u");
  if (!rawUrl) return placeholder();

  let originalUrl: string;
  try {
    originalUrl = decodeURIComponent(rawUrl);
    new URL(originalUrl); // validate
  } catch {
    return placeholder();
  }

  // Only proxy turbocentras images (safety check)
  if (!originalUrl.includes("turbocentras.com")) {
    return NextResponse.redirect(originalUrl, { status: 302 });
  }

  const path = storagePath(originalUrl);

  // 1. Check if already cached in Supabase Storage
  const { data: existing } = await supabase.storage.from(BUCKET).list(
    path.substring(0, path.lastIndexOf("/")),
    { search: path.split("/").pop() }
  );
  if (existing && existing.length > 0) {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.redirect(urlData.publicUrl, { status: 302 });
  }

  // 2. Try to fetch from turbocentras
  try {
    const res = await fetch(originalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://turbocentras.com/",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return placeholder();

    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";

    // 3. Upload to Supabase Storage for future cache hits
    supabase.storage.from(BUCKET).upload(path, Buffer.from(buf), {
      contentType,
      upsert: true,
    }).then(({ error }) => {
      if (error) console.error("[img-proxy] upload failed:", error.message);
    });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return placeholder();
  }
}
