import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lets a sync job run when either:
//  - the request carries the CRON_SECRET (Vercel cron, manual runs), or
//  - it's a scheduler ping (Supabase pg_cron) and the job hasn't run within `minIntervalSec`.
// The throttle means public pings can never make us call Turbocentras more often than planned.
export async function cronAllowed(req: NextRequest, supabase: SupabaseClient, job: string, minIntervalSec: number) {
  const secret = process.env.CRON_SECRET;
  const key = `${job}_last_run`;
  const now = new Date();
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) {
    await supabase.from("cron_state").upsert({ key, value: now.toISOString(), updated_at: now.toISOString() }, { onConflict: "key" });
    return { ok: true as const };
  }
  const { data } = await supabase.from("cron_state").select("updated_at").eq("key", key).maybeSingle();
  const last = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
  const waitSec = Math.ceil((last + minIntervalSec * 1000 - now.getTime()) / 1000);
  if (waitSec > 0) return { ok: false as const, waitSec };
  await supabase.from("cron_state").upsert({ key, value: now.toISOString(), updated_at: now.toISOString() }, { onConflict: "key" });
  return { ok: true as const };
}
