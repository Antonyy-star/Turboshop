"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const POLL_MS = 30_000;

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
  inStockCount: number;
  outOfStockCount: number;
};

export default function StockFeed({ initialEvents, initialLastScan, inStockCount, outOfStockCount }: Props) {
  const [events, setEvents] = useState<StockEvent[]>(initialEvents);
  const [connected, setConnected] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(initialLastScan);
  const newestIdRef = useRef<string | null>(initialEvents[0]?.id ?? null);

  // Supabase Realtime subscription (fires instantly when Realtime publication is enabled)
  useEffect(() => {
    const channel = supabase
      .channel("stock-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stock_events" },
        (payload) => {
          const ev = payload.new as StockEvent;
          newestIdRef.current = ev.id;
          setEvents((prev) => [ev, ...prev].slice(0, 50));
          setLastScan(new Date().toISOString());
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 30-second polling fallback — catches new events even if Realtime publication isn't enabled
  useEffect(() => {
    async function poll() {
      try {
        const { data } = await supabase
          .from("stock_events")
          .select("id, sku, product_name, brand, old_status, new_status, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (!data || data.length === 0) return;

        // Only update if there's actually something newer than what we have
        if (data[0].id !== newestIdRef.current) {
          newestIdRef.current = data[0].id;
          setEvents(data);
          setLastScan(data[0].created_at);
        }
      } catch {}
    }

    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: "#141414", border: "1px solid #1f1f1f", borderRadius: 12, padding: 24 }}>

      {/* Header */}
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

      {/* Real stock counts from products table */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#065f4620", border: "1px solid #065f46", borderRadius: 8, padding: "12px 16px", flex: 1, textAlign: "center" }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#34d399", margin: 0 }}>{inStockCount.toLocaleString("sv-SE")}</p>
          <p style={{ fontSize: 11, color: "#34d399", margin: "4px 0 0" }}>I lager</p>
        </div>
        <div style={{ background: "#7f1d1d20", border: "1px solid #7f1d1d", borderRadius: 8, padding: "12px 16px", flex: 1, textAlign: "center" }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#f87171", margin: 0 }}>{outOfStockCount.toLocaleString("sv-SE")}</p>
          <p style={{ fontSize: 11, color: "#f87171", margin: "4px 0 0" }}>Slut i lager</p>
        </div>
        <div style={{ background: "#1e3a5f20", border: "1px solid #1e3a5f", borderRadius: 8, padding: "12px 16px", flex: 1, textAlign: "center" }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#60a5fa", margin: 0 }}>{events.length}</p>
          <p style={{ fontSize: 11, color: "#60a5fa", margin: "4px 0 0" }}>Detekterade ändringar</p>
        </div>
      </div>

      {/* Change events feed */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        Senaste statusändringar
      </p>

      {events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ color: "#555", fontSize: 13, margin: 0 }}>Inga statusändringar ännu.</p>
          <p style={{ color: "#444", fontSize: 12, margin: "6px 0 0" }}>Skannern kontrollerar turbocentras.com automatiskt.</p>
        </div>
      ) : (
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {events.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
              <span style={{
                background: e.new_status ? "#065f46" : "#7f1d1d",
                color: e.new_status ? "#34d399" : "#f87171",
                fontSize: 10, fontWeight: 700, padding: "3px 8px",
                borderRadius: 4, flexShrink: 0, minWidth: 76, textAlign: "center"
              }}>
                {e.new_status ? "I LAGER" : "SLUT I LAGER"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
