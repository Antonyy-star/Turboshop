"use client";

import { useState, useTransition } from "react";
import { Package, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { deleteActivityLog } from "@/app/admin/(dashboard)/activity/actions";

type ImportLog = {
  id: string;
  entity_name: string | null;
  created_at: string;
  metadata?: { details?: string[] } | null;
};

type HardcodedEntry = {
  id: string;
  date: string;
  title: string;
  details: string[];
};

type Props = {
  hardcoded: HardcodedEntry;
  logs: ImportLog[];
};

export default function NewEventsCarousel({ hardcoded, logs: initialLogs }: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const [idx, setIdx] = useState(0);
  const [, startTransition] = useTransition();

  const total = 1 + logs.length;

  function prev() { setIdx((i) => (i - 1 + total) % total); }
  function next() { setIdx((i) => (i + 1) % total); }

  const isHardcoded = idx === 0;
  const log = isHardcoded ? null : logs[idx - 1];

  function handleDelete(id: string) {
    if (!confirm("Ta bort den här rapporten permanent?")) return;
    startTransition(async () => {
      await deleteActivityLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setIdx((i) => Math.max(0, i - 1));
    });
  }

  return (
    <div style={{ marginBottom: 36, boxSizing: "border-box", maxWidth: "100%" }}>
      <style>{`
        @media (max-width: 768px) {
          .nec-header { flex-wrap: wrap; row-gap: 6px; }
          .nec-subtitle { display: none !important; }
          .nec-indent { padding-left: 0 !important; }
          .nec-detail-line { word-break: break-all; overflow-wrap: anywhere; }
          .nec-entity-name { word-break: break-all; overflow-wrap: anywhere; }
          .nec-log-date { display: none !important; }
          .nec-log-row { padding-right: 8px !important; }
          .nec-card { overflow: hidden; }
        }
      `}</style>

      {/* Header */}
      <div className="nec-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Nya Händelser</h2>
        <span style={{ background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
          {total}
        </span>
        <span className="nec-subtitle" style={{ fontSize: 11, color: "#555", marginLeft: 4 }}>Nya produkter &amp; importer</span>

        {/* Navigation controls */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#444" }}>{idx + 1} / {total}</span>
          <button
            onClick={prev}
            disabled={total <= 1}
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6,
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: total <= 1 ? "default" : "pointer", color: total <= 1 ? "#333" : "#888",
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={next}
            disabled={total <= 1}
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6,
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: total <= 1 ? "default" : "pointer", color: total <= 1 ? "#333" : "#888",
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="nec-card" style={{
        background: "#141414", border: "1px solid #3b82f633",
        borderLeft: "3px solid #3b82f6", borderRadius: 10, padding: "16px 20px",
        minHeight: 80, position: "relative", boxSizing: "border-box", maxWidth: "100%",
      }}>
        {isHardcoded ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#3b82f618", border: "1px solid #3b82f633", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Package size={13} color="#3b82f6" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", flex: 1, minWidth: 0 }}>{hardcoded.title}</p>
              <span className="nec-log-date" style={{ fontSize: 11, color: "#555", flexShrink: 0 }}>{hardcoded.date}</span>
            </div>
            <div className="nec-indent" style={{ paddingLeft: 38 }}>
              {hardcoded.details.map((line, i) =>
                line === "" ? (
                  <div key={i} style={{ height: 6 }} />
                ) : (
                  <p key={i} className="nec-detail-line" style={{
                    fontSize: 12, lineHeight: 1.7,
                    color: line.startsWith("TUNING") || line.startsWith("UTRUSTNING") ? "#aaa" : "#555",
                    fontWeight: line.startsWith("TUNING") || line.startsWith("UTRUSTNING") ? 600 : 400,
                  }}>
                    {line}
                  </p>
                )
              )}
            </div>
          </>
        ) : log ? (
          <>
            {/* Delete button */}
            <button
              onClick={() => handleDelete(log.id)}
              title="Ta bort rapport"
              style={{
                position: "absolute", top: 12, right: 12,
                background: "none", border: "1px solid #2a2a2a", borderRadius: 6,
                width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#555",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef444444"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#555"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; }}
            >
              <Trash2 size={12} />
            </button>

            <div className="nec-log-row" style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingRight: 36 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#3b82f618", border: "1px solid #3b82f633", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <Package size={13} color="#3b82f6" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="nec-entity-name" style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginBottom: 8 }}>
                  {log.entity_name ?? "Systemimport"}
                </p>
                {Array.isArray(log.metadata?.details) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(log.metadata!.details as string[]).map((line, i) => (
                      <p key={i} className="nec-detail-line" style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
              <span className="nec-log-date" style={{ fontSize: 11, color: "#444", flexShrink: 0 }}>
                {new Date(log.created_at).toLocaleDateString("sv-SE")}
              </span>
            </div>
          </>
        ) : null}
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 16 : 6, height: 6, borderRadius: 99,
                background: i === idx ? "#3b82f6" : "#2a2a2a",
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
