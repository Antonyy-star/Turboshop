import { createClient } from "@/lib/supabase/server";
import { Package, FileText, MessageSquare, Trash2, Pencil, Plus } from "lucide-react";

const ACTION_META: Record<string, { label: string; color: string; Icon: any }> = {
  product_added:   { label: "Lade till produkt",          color: "#22c55e", Icon: Plus },
  product_updated: { label: "Uppdaterade produkt",        color: "#3b82f6", Icon: Pencil },
  product_deleted: { label: "Tog bort produkt",           color: "#ef4444", Icon: Trash2 },
  content_updated: { label: "Uppdaterade innehåll",       color: "#a855f7", Icon: FileText },
  contact_handled: { label: "Hanterade kontaktförfrågan", color: "#f59e0b", Icon: MessageSquare },
};

function initials(name: string) {
  return name.split(/[\s@]/)[0].slice(0, 2).toUpperCase();
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just nu";
  if (m < 60) return `${m} min sedan`;
  if (h < 24) return `${h} tim sedan`;
  if (d < 7) return `${d} dagar sedan`;
  return new Date(date).toLocaleDateString("sv-SE");
}

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  // Group by date
  const grouped: Record<string, typeof logs> = {};
  for (const log of logs ?? []) {
    const day = new Date(log.created_at).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day]!.push(log);
  }

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

      {!logs || logs.length === 0 ? (
        <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <p style={{ color: "#555", fontSize: 15 }}>Inga händelser ännu. Aktiviteter loggas automatiskt när admins gör ändringar.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {Object.entries(grouped).map(([day, dayLogs]) => (
            <div key={day}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{day}</p>
              <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden" }}>
                {dayLogs!.map((log, idx) => {
                  const meta = ACTION_META[log.action_type] ?? { label: log.action_type, color: "#666", Icon: Package };
                  const { Icon } = meta;
                  return (
                    <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: idx < dayLogs!.length - 1 ? "1px solid #1a1a1a" : "none" }}>
                      {/* Action icon */}
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${meta.color}18`, border: `1px solid ${meta.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={14} color={meta.color} />
                      </div>

                      {/* Description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: "#ccc" }}>
                          <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                          {log.entity_name && <span style={{ color: "#fff" }}> — {log.entity_name}</span>}
                        </p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                            {Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </p>
                        )}
                      </div>

                      {/* Admin */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                          {initials(log.admin_name || log.admin_email)}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 12, color: "#aaa" }}>{log.admin_name || log.admin_email}</p>
                          <p style={{ fontSize: 11, color: "#555" }}>{relativeTime(log.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
