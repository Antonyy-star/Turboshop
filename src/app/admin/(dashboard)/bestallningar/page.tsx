import { createServiceClient } from "@/lib/supabase/server";
import OrdersManager from "@/components/admin/OrdersManager";
import type { Order } from "@/lib/orders";

export const metadata = { title: "Beställningar" };

export default async function AdminOrdersPage() {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
  return <OrdersManager orders={(data ?? []) as Order[]} loadFailed={!!error} />;
}
