import { createServiceClient } from "@/lib/supabase/server";
import SecondBrainGraph from "@/components/admin/SecondBrainGraph";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Second Brain" };

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "yucellevon@gmail.com";

export default async function SecondBrainPage() {
  const supabase = createServiceClient();

  const [
    { count: productTotal },
    { count: inStockCount },
    { count: outOfStockCount },
    { count: openContactCount },
    { data: { users } },
    notesResult,
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("in_stock", true),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("in_stock", false),
    supabase.from("contact_submissions").select("*", { count: "exact", head: true }).or("status.is.null,status.eq.open"),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("brain_notes").select("id, title, content").order("created_at", { ascending: false }),
  ]);

  const customerCount = (users ?? []).filter((u: any) => u.email !== ADMIN_EMAIL).length;
  const initialNotes = (notesResult.error ? [] : (notesResult.data ?? [])) as Array<{ id: string; title: string; content: string }>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Second Brain</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Din kunskapsgraf — klicka på noder för att utforska och ta anteckningar</p>
      </div>
      <SecondBrainGraph
        productTotal={productTotal ?? 0}
        inStockCount={inStockCount ?? 0}
        outOfStockCount={outOfStockCount ?? 0}
        openContactCount={openContactCount ?? 0}
        customerCount={customerCount}
        initialNotes={initialNotes}
      />
    </div>
  );
}
