import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncSpecs } from "@/lib/turbocentras/specs";
import { cronAllowed } from "@/lib/cron-guard";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Refreshes technical specs (numbers, compatible parts, fits-turbos, properties) from the API. Daily.
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const gate = await cronAllowed(req, supabase, "specs_sync", 20 * 3600);
  if (!gate.ok) return NextResponse.json({ skipped: true, retryInSec: gate.waitSec }, { status: 429 });
  try {
    const result = await syncSpecs(supabase);
    await supabase.from("cron_state").upsert(
      { key: "specs_sync", value: JSON.stringify(result), updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
