"use client";

import { useEffect, useState } from "react";

function getStatus(): { open: boolean; label: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  const total = hour * 60 + minute;

  const isWeekday = ["mån", "tis", "ons", "tor", "fre"].includes(weekday);
  const isSaturday = weekday === "lör";

  const open =
    (isWeekday && total >= 9 * 60 && total < 18 * 60) ||
    (isSaturday && total >= 10 * 60 && total < 15 * 60);

  return { open, label: open ? "Öppet nu" : "Stängt nu" };
}

export default function OpenStatusBadge() {
  const [status, setStatus] = useState<{ open: boolean; label: string } | null>(null);

  useEffect(() => {
    setStatus(getStatus());
    const id = setInterval(() => setStatus(getStatus()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        fontWeight: 600,
        color: status.open ? "#4ade80" : "#f87171",
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          width: 8,
          height: 8,
        }}
      >
        {/* pulsing ring */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            backgroundColor: status.open ? "#4ade80" : "#f87171",
            opacity: 0.5,
            animation: "status-ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        {/* solid dot */}
        <span
          style={{
            position: "relative",
            borderRadius: "50%",
            width: 8,
            height: 8,
            backgroundColor: status.open ? "#22c55e" : "#ef4444",
          }}
        />
      </span>
      {status.label}
    </span>
  );
}
