// Runs the site's Turbocentras sync jobs from this computer (same code as the Vercel crons).
//   npx tsx scripts/run-sync.ts specs --dry
//   npx tsx scripts/run-sync.ts specs | products | stock | catalog
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^﻿/, "");
}

async function main() {
  const job = process.argv[2];
  const dryRun = process.argv.includes("--dry");
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false }, global: { headers: { "x-turboshop-client": "site" } } });
  const t0 = Date.now();
  let result: unknown;
  if (job === "specs") result = await (await import("../src/lib/turbocentras/specs")).syncSpecs(supabase, { dryRun });
  else if (job === "products") result = await (await import("../src/lib/turbocentras/sync")).syncProducts(supabase, { deadline: Date.now() + 3_600_000, maxImagesToMirror: 5000 });
  else if (job === "catalog") result = await (await import("../src/lib/turbocentras/catalog")).syncCatalog(supabase, { dryRun });
  else if (job === "stock") result = await (await import("../src/lib/turbocentras/stock")).syncStock(supabase);
  else throw new Error("usage: run-sync.ts specs|products|stock|catalog [--dry]");
  console.log(JSON.stringify(result, null, 2));
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
main().catch(e => { console.error("FATAL", e.message); process.exit(1); });
