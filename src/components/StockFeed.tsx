"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StockEvent = {
  id: string;
  sku: string;
  product_name: string;
  brand: string;
  old_status: boolean;
  new_status: boolean;
  created_at: string;
};

type Props = {
  initialEvents: StockEvent[];
  initialLastScan: string | null;
};

export default function StockFeed({ initialEvents, initialLastScan }: Props) {
  const [events, setEvents] = useState<StockEvent[]>(initialEvents);
  const [connected, setConnected] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(initialLastScan);

  useEffect(() => {
    // Subscribe to new events via Realtime — initial data already loaded server-side
    const channel = supabase
      .channel("stock-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stock_events" },
        (payload) => {
          setEvents((prev) => [payload.new as StockEvent, ...prev].slice(0, 50));
          setLastScan(new Date().toISOString());
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const inStockCount = events.filter(e => e.new_status).length;
  const outOfStockCount = events.filter(e => !e.new_status).length;

  return (
    <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Live lageruppdateringar</h2>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11, color: connected ? "#34d399" : "#f59e0b",
            background: connected ? "#065f4620" : "#78350f20",
            border: `1px solid ${connected ? "#065f46" : "#78350f"}`,
            borderRadius: 20, padding: "2px 8px"
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: connected ? "#34d399" : "#f59e0b",
              animation: connected ? "pulse 2s infinite" : "none"
            }} />
            {connected ? "Live" : "Ansluter..."}
          </span>
        </div>
        {lastScan && (
          <span style={{ fontSize: 11, color: "#555" }}>
            Senaste skanning: {new Date(lastScan).toLocaleString("sv-SE")}
          </span>
        )}
      </div>

      {events.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#065f4620", border: "1px solid #065f46", borderRadius: 8, padding: "8px 14px", flex: 1, textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#34d399", margin: 0 }}>{inStockCount}</p>
            <p style={{ fontSize: 11, color: "#34d399", margin: 0 }}>Kom i lager</p>
          </div>
          <div style={{ background: "#7f1d1d20", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 14px", flex: 1, textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#f87171", margin: 0 }}>{outOfStockCount}</p>
            <p style={{ fontSize: 11, color: "#f87171", margin: 0 }}>Slut i lager</p>
          </div>
          <div style={{ background: "#1e3a5f20", border: "1px solid #1e3a5f", borderRadius: 8, padding: "8px 14px", flex: 1, textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa", margin: 0 }}>{events.length}</p>
            <p style={{ fontSize: 11, color: "#60a5fa", margin: 0 }}>Totalt ändringar</p>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ color: "#555", fontSize: 13, margin: 0 }}>Inga lagerförändringar ännu.</p>
          <p style={{ color: "#444", fontSize: 12, margin: "6px 0 0" }}>Skannern kontrollerar turbocentras.com var 5:e minut.</p>
        </div>
      ) : (
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {events.map((e) => (
            <div
              key={e.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderBottom: "1px solid #1a1a1a"
              }}
            >
              <span style={{
                background: e.new_status ? "#065f46" : "#7f1d1d",
                color: e.new_status ? "#34d399" : "#f87171",
                fontSize: 10, fontWeight: 700, padding: "3px 8px",
                borderRadius: 4, flexShrink: 0, minWidth: 70, textAlign: "center"
              }}>
                {e.new_status ? "I LAGER" : "SLUT"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 500, color: "#fff",
                  margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                }}>
                  {e.brand} {e.sku} — {e.product_name}
                </p>
                <p style={{ fontSize: 11, color: "#555", margin: 0 }}>
                  {e.old_status ? "I lager" : "Slut"} → {e.new_status ? "I lager" : "Slut"} &nbsp;·&nbsp;
                  {new Date(e.created_at).toLocaleString("sv-SE")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
