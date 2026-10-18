import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncStock } from "@/lib/turbocentras/stock";
import { cronAllowed } from "@/lib/cron-guard";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Makes in_stock match Turbocentras exactly (API only). Pinged every 5 minutes by Supabase pg_cron.
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const gate = await cronAllowed(req, supabase, "stock_sync", 240);
  if (!gate.ok) return NextResponse.json({ skipped: true, retryInSec: gate.waitSec }, { status: 429 });
  try {
    return NextResponse.json(await syncStock(supabase));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
