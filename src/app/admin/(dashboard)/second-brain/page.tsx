import { createServiceClient } from "@/lib/supabase/server";
import SecondBrainGraph from "@/components/admin/SecondBrainGraph";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Second Brain" };
export const revalidate = 60;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "yucellevon@gmail.com";

export default async function SecondBrainPage() {
  const supabase = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: productTotal },
    { count: inStockCount },
    { count: outOfStockCount },
    { count: openContactCount },
    { count: handledContactCount },
    { data: { users } },
    { data: allCategories },
    { data: allBrands },
    { count: todayActivityCount },
    { data: lastActivityData },
    cronResult,
    notesResult,
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("in_stock", true),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("in_stock", false),
    supabase.from("contact_submissions").select("*", { count: "exact", head: true }).or("status.is.null,status.eq.open"),
    supabase.from("contact_submissions").select("*", { count: "exact", head: true }).eq("status", "handled"),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("products").select("category").not("category", "is", null),
    supabase.from("products").select("brand").not("brand", "is", null),
    supabase.from("activity_log").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
    supabase.from("activity_log").select("action, admin_name, created_at").order("created_at", { ascending: false }).limit(1),
    supabase.from("cron_state").select("updated_at").eq("key", "stock_check_cursor").maybeSingle(),
    supabase.from("brain_notes").select("id, title, content, color, node_category").order("created_at", { ascending: false }),
  ]);

  const customerCount = (users ?? []).filter((u: any) => u.email !== ADMIN_EMAIL).length;

  const categoryCounts: Record<string, number> = {};
  for (const row of allCategories ?? []) {
    const cat = (row as any).category as string;
    if (cat) categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }

  const brandCounts: Record<string, number> = {};
  for (const row of allBrands ?? []) {
    const brand = (row as any).brand as string;
    if (brand) brandCounts[brand] = (brandCounts[brand] ?? 0) + 1;
  }
  const topBrands = Object.entries(brandCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([brand, count]) => ({ brand, count }));

  const lastActivity = (lastActivityData as any[] | null)?.[0] ?? null;
  const cronData = cronResult.data as { updated_at: string } | null;
  const lastStockCheck = (!cronResult.error && cronData) ? cronData.updated_at : null;

  const initialNotes = (notesResult.error ? [] : (notesResult.data ?? [])) as Array<{
    id: string; title: string; content: string; color: string; node_category: string;
  }>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Second Brain</h1>
        <p style={{ color: "#666", fontSize: 14 }}>
          Din kunskapsgraf — klicka noder för info, dra för att placera, högerklicka för alternativ
        </p>
      </div>
      <SecondBrainGraph
        productTotal={productTotal ?? 0}
        inStockCount={inStockCount ?? 0}
        outOfStockCount={outOfStockCount ?? 0}
        openContactCount={openContactCount ?? 0}
        handledContactCount={handledContactCount ?? 0}
        customerCount={customerCount}
        categoryCounts={categoryCounts}
        topBrands={topBrands}
        todayActivityCount={todayActivityCount ?? 0}
        lastActivityAction={lastActivity?.action ?? null}
        lastStockCheck={lastStockCheck}
        initialNotes={initialNotes}
      />
    </div>
  );
}
