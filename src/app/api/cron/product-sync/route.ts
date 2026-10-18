import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncProducts } from "@/lib/turbocentras/sync";
import { cronAllowed } from "@/lib/cron-guard";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Imports new/changed Turbocentras products and mirrors their images. Pinged hourly by Supabase pg_cron.
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const gate = await cronAllowed(req, supabase, "product_sync", 50 * 60);
  if (!gate.ok) return NextResponse.json({ skipped: true, retryInSec: gate.waitSec }, { status: 429 });
  try {
    const result = await syncProducts(supabase, { deadline: Date.now() + 270_000 });
    await supabase.from("cron_state").upsert(
      { key: "product_sync", value: JSON.stringify(result), updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
