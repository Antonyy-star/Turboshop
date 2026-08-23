"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Trash2, Package, FileText, MessageSquare, Pencil, Plus, Tag, UserPlus, UserMinus, ToggleRight, ToggleLeft } from "lucide-react";
import { deleteActivityLog } from "@/app/admin/(dashboard)/activity/actions";

type Log = {
  id: string;
  action_type: string;
  entity_name: string | null;
  admin_email: string;
  admin_name: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

type DayGroup = { day: string; logs: Log[] };

type Props = { groups: DayGroup[] };

const ACTION_META: Record<string, { label: string; color: string; Icon: any }> = {
  product_added:            { label: "Lade till produkt",          color: "#22c55e", Icon: Plus },
  product_updated:          { label: "Uppdaterade produkt",        color: "#3b82f6", Icon: Pencil },
  product_deleted:          { label: "Tog bort produkt",           color: "#ef4444", Icon: Trash2 },
  content_updated:          { label: "Uppdaterade innehåll",       color: "#a855f7", Icon: FileText },
  contact_handled:          { label: "Hanterade kontaktförfrågan", color: "#f59e0b", Icon: MessageSquare },
  contact_reopened:         { label: "Återöppnade förfrågan",      color: "#f59e0b", Icon: MessageSquare },
  create_discount_code:     { label: "Skapade rabattkod",          color: "#22c55e", Icon: Tag },
  activate_discount_code:   { label: "Aktiverade rabattkod",       color: "#3b82f6", Icon: ToggleRight },
  deactivate_discount_code: { label: "Inaktiverade rabattkod",     color: "#f59e0b", Icon: ToggleLeft },
  delete_discount_code:     { label: "Raderade rabattkod",         color: "#ef4444", Icon: Trash2 },
  create_customer:          { label: "Skapade kundkonto",          color: "#22c55e", Icon: UserPlus },
  delete_customer:          { label: "Raderade kundkonto",         color: "#ef4444", Icon: UserMinus },
  specs_update:             { label: "Uppdaterade produktspecar",  color: "#3b82f6", Icon: Pencil },
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

export default function ActivityCarousel({ groups: initialGroups }: Props) {
  const [groups, setGroups] = useState(initialGroups);
  const [idx, setIdx] = useState(0);
  const [, startTransition] = useTransition();

  const total = groups.length;

  function prev() { setIdx((i) => Math.max(0, i - 1)); }
  function next() { setIdx((i) => Math.min(total - 1, i + 1)); }

  function handleDelete(logId: string) {
    if (!confirm("Ta bort den här logghändelsen permanent?")) return;
    startTransition(async () => {
      await deleteActivityLog(logId);
      setGroups((prev) => {
        const updated = prev.map((g) => ({
          ...g,
          logs: g.logs.filter((l) => l.id !== logId),
        })).filter((g) => g.logs.length > 0);
        setIdx((i) => Math.min(i, Math.max(0, updated.length - 1)));
        return updated;
      });
    });
  }

  if (total === 0) {
    return (
      <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 60, textAlign: "center" }}>
        <p style={{ color: "#555", fontSize: 15 }}>Inga händelser ännu. Aktiviteter loggas automatiskt när admins gör ändringar.</p>
      </div>
    );
  }

  const group = groups[idx];

  return (
    <div style={{ boxSizing: "border-box", maxWidth: "100%" }}>
      <style>{`
        @media (max-width: 768px) {
          .ac-header { flex-wrap: wrap; row-gap: 4px; }
          .ac-log-row { padding: 10px 12px !important; gap: 10px !important; }
          .ac-content { word-break: break-all; overflow-wrap: anywhere; }
          .ac-admin-name { display: none !important; }
          .ac-admin-section { gap: 6px !important; }
          .ac-day-card { overflow: hidden; }
        }
      `}</style>

      {/* Header row */}
      <div className="ac-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {group?.day}
        </p>
        <span style={{ fontSize: 11, color: "#333" }}>· {group?.logs.length} händelser</span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#444" }}>{idx + 1} / {total}</span>
          <button
            onClick={prev}
            disabled={idx === 0}
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6,
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? "#333" : "#888",
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={next}
            disabled={idx === total - 1}
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6,
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: idx === total - 1 ? "default" : "pointer", color: idx === total - 1 ? "#333" : "#888",
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Day card */}
      <div className="ac-day-card" style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden", boxSizing: "border-box", maxWidth: "100%" }}>
        {group?.logs.map((log, i) => {
          const meta = ACTION_META[log.action_type] ?? { label: log.action_type, color: "#666", Icon: Package };
          const { Icon } = meta;
          return (
            <div key={log.id} className="ac-log-row" style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
              borderBottom: i < group.logs.length - 1 ? "1px solid #1a1a1a" : "none",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${meta.color}18`, border: `1px solid ${meta.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={14} color={meta.color} />
              </div>

              <div className="ac-content" style={{ flex: 1, minWidth: 0 }}>
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

              <div className="ac-admin-section" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                    {initials(log.admin_name || log.admin_email)}
                  </div>
                  <div className="ac-admin-name" style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 12, color: "#aaa" }}>{log.admin_name || log.admin_email}</p>
                    <p style={{ fontSize: 11, color: "#555" }}>{relativeTime(log.created_at)}</p>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(log.id)}
                  title="Ta bort"
                  style={{
                    background: "none", border: "1px solid #2a2a2a", borderRadius: 6,
                    width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#555", marginLeft: 4,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef444444"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#555"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 12 }}>
          {groups.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 16 : 6, height: 6, borderRadius: 99,
                background: i === idx ? "#dc2626" : "#2a2a2a",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
