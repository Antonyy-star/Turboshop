import { createServiceClient } from "@/lib/supabase/server";
import ActivityCarousel from "@/components/admin/ActivityCarousel";

function initials(name: string) {
  return name.split(/[\s@]/)[0].slice(0, 2).toUpperCase();
}

export default async function ActivityPage() {
  const supabase = createServiceClient();
  const { data: logs } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  // Group by date
  const groupMap: Record<string, typeof logs> = {};
  for (const log of logs ?? []) {
    const day = new Date(log.created_at).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
    if (!groupMap[day]) groupMap[day] = [];
    groupMap[day]!.push(log);
  }
  const groups = Object.entries(groupMap).map(([day, dayLogs]) => ({ day, logs: dayLogs! }));

  // Stats per admin
  const adminStats: Record<string, { name: string; count: number }> = {};
  for (const log of logs ?? []) {
    if (!adminStats[log.admin_email]) adminStats[log.admin_email] = { name: log.admin_name || log.admin_email, count: 0 };
    adminStats[log.admin_email].count++;
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Ändringslogg</h1>
        <p style={{ color: "#666", fontSize: 14 }}>{logs?.length ?? 0} händelser registrerade</p>
      </div>

      {/* Admin activity summary */}
      {Object.keys(adminStats).length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
          {Object.entries(adminStats).map(([email, { name, count }]) => (
            <div key={email} style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {initials(name)}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{name}</p>
                <p style={{ fontSize: 11, color: "#555" }}>{count} åtgärder</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <ActivityCarousel groups={groups} />
    </div>
  );
}
