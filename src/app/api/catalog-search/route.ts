import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { suggestCatalog } from "@/lib/catalog/search";

// Suggestions for the advanced catalog search box.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  try {
    const suggestions = await suggestCatalog(createServiceClient(), q);
    return NextResponse.json({ suggestions }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
