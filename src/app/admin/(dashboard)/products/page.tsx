import { createClient, createServiceClient } from "@/lib/supabase/server";
import ProductsManager from "@/components/admin/ProductsManager";
import { Package } from "lucide-react";
import { normalizeRef } from "@/lib/normalize";

const PAGE_SIZE = 50;

// Hardcoded initial import — 132 products added 2026-08-19
const INITIAL_IMPORT = {
  id: "nh-products-1",
  date: "2026-08-19",
  title: "132 nya produkter tillagda — Tuning & Utrustning",
  details: [
    "TUNING (34 produkter) — kompressorhjul, turbos, lagerhus, turbinhus:",
    "• Turbo 898200-5001W, Turbo 898199-5001W",
    "• Compressor wheel: IH-03-0051, BW-03-0176/0175/0164/0163/0161/0160/0105/0099/0002",
    "• Compressor wheel: GA-03-0164/0163/0147/0142/0141/0140/0139/0102/0101/0088/0086",
    "• Compressor wheel: MH-03-0067/0066/0065/0064/0060/0059/0044, IH-03-0048/0042",
    "• Bearing housing GA-01-0174, Turbine housing GA-09-0025",
    "",
    "UTRUSTNING (98 produkter) — diagnosverktyg, aktuatorer, testare, reparationskit:",
    "• Testare/Programmerare: VNTT-PRO, TURBO-PROG, TurboControlTC, APD-1, TP-TACT",
    "• Aktuatorverktyg: ART-1 t.o.m. ART-5, ART SET-1, ART SET-2, ARK-1, ARK-2",
    "• Munstycksringnycklar: GAR-1 t.o.m. GAR-6, GAR-6-6",
    "• Diagnoskabler: HE01–HE08, SE01–SE09, MT01–MT03, BS01, CN01, DE01–DE02, SN01–SN02, MA01–MA03, DC01, UNIV-1",
    "• TurboControl Cables: Green 1–10, Blue 11–20, Red 21–30, Yellow 31–38, Orange H99",
    "• Maskiner: Shot blasting machine (SM0001–SM0003), Dry blasting, Pneumatic grinder (OP-192K)",
    "• Övrigt: Pressure tester VT1205, Repair Kit RWS-1, Turbo exposition",
  ],
};

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  const { page: pageStr, q, category } = await searchParams;
  const page   = Math.max(1, parseInt(pageStr ?? "1", 10));
  const search = (q ?? "").trim();

  const supabase = await createClient();

  // Fetch product import events — ONLY system_import, never mixes with stock_change
  const { data: importLogs } = await supabase
    .from("activity_log")
    .select("*")
    .eq("action_type", "system_import")
    .order("created_at", { ascending: false })
    .limit(20);

  const serviceClient = createServiceClient();

  let products: any[] = [];
  let count = 0;

  if (search) {
    const esc = search.replace(/[%_\\]/g, "\\$&");
    const normQ = normalizeRef(search);
    const orFilter = `name.ilike.%${esc}%,sku.ilike.%${esc}%,brand.ilike.%${esc}%`;

    const catFilter = (q: any) => category ? q.eq("category", category) : q;

    const [primaryRes, oemRes, normRes] = await Promise.all([
      catFilter(serviceClient.from("products")
        .select("id,name,brand,sku,price,images,category,in_stock,badge,created_at", { count: "exact" })
        .or(orFilter))
        .order("name", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
      catFilter(serviceClient.from("products")
        .select("id,name,brand,sku,price,images,category,in_stock,badge,created_at")
        .filter("specs->>turbo_numbers", "ilike", `%${esc}%`))
        .limit(PAGE_SIZE),
      normQ.length >= 2
        ? serviceClient.rpc("search_normalized", { query_norm: normQ, result_limit: PAGE_SIZE })
        : Promise.resolve({ data: [] }),
    ]);

    const primary: any[] = primaryRes.data ?? [];
    const seen = new Set<string>(primary.map((p: any) => String(p.id)));
    count = primaryRes.count ?? 0;

    const oemOnly = ((oemRes as any).data ?? []).filter((p: any) => !seen.has(String(p.id)));
    oemOnly.forEach((p: any) => seen.add(String(p.id)));

    const normOnly = ((normRes as any).data ?? []).filter((p: any) => p?.id && !seen.has(String(p.id)));

    products = [...primary, ...oemOnly, ...normOnly];
    count += oemOnly.length + normOnly.length;
  } else {
    let query = serviceClient
      .from("products")
      .select("id,name,brand,sku,price,images,category,in_stock,badge,created_at", { count: "exact" });
    if (category) query = (query as any).eq("category", category);
    const res = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    products = res.data ?? [];
    count = res.count ?? 0;
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div>
      {/* ── Nya Händelser — Nya Produkter (ONLY product imports, never stock changes) ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Nya Händelser</h2>
          <span style={{ background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
            {1 + (importLogs?.length ?? 0)}
          </span>
          <span style={{ fontSize: 11, color: "#555", marginLeft: 4 }}>Nya produkter &amp; importer</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Always-visible hardcoded entry for the 132-product import */}
          <div style={{ background: "#141414", border: "1px solid #3b82f633", borderLeft: "3px solid #3b82f6", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#3b82f618", border: "1px solid #3b82f633", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Package size={13} color="#3b82f6" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{INITIAL_IMPORT.title}</p>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#555", flexShrink: 0 }}>{INITIAL_IMPORT.date}</span>
            </div>
            <div style={{ paddingLeft: 38 }}>
              {INITIAL_IMPORT.details.map((line, i) =>
                line === "" ? (
                  <div key={i} style={{ height: 6 }} />
                ) : (
                  <p key={i} style={{
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: line.startsWith("TUNING") || line.startsWith("UTRUSTNING") ? "#aaa" : "#555",
                    fontWeight: line.startsWith("TUNING") || line.startsWith("UTRUSTNING") ? 600 : 400,
                  }}>
                    {line}
                  </p>
                )
              )}
            </div>
          </div>

          {/* Dynamic entries from activity_log (system_import only) */}
          {importLogs?.map((l) => (
            <div key={l.id} style={{ background: "#141414", border: "1px solid #3b82f633", borderLeft: "3px solid #3b82f6", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#3b82f618", border: "1px solid #3b82f633", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Package size={13} color="#3b82f6" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{l.entity_name ?? "Systemimport"}</p>
                {Array.isArray(l.metadata?.details) && (
                  <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                    {(l.metadata.details as string[]).slice(0, 2).join(" · ")}
                  </p>
                )}
              </div>
              <span style={{ fontSize: 11, color: "#444", flexShrink: 0 }}>
                {new Date(l.created_at).toLocaleDateString("sv-SE")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ProductsManager
        initialProducts={products ?? []}
        totalCount={count ?? 0}
        page={page}
        totalPages={totalPages}
        search={search}
        category={category ?? ""}
      />
    </div>
  );
}
