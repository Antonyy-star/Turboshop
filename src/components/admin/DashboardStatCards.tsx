"use client";

import Link from "next/link";
import { Package, MessageSquare, Users, TrendingUp } from "lucide-react";
import { useState } from "react";

type Stat = {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  href: string;
};

const ICONS: Record<string, React.ElementType> = {
  package: Package,
  message: MessageSquare,
  users: Users,
  trending: TrendingUp,
};

function StatCard({ stat }: { stat: Stat }) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[stat.icon] ?? Package;

  return (
    <Link
      href={stat.href}
      style={{
        background: "#141414",
        border: `1px solid ${hovered ? stat.color + "55" : "#1f1f1f"}`,
        borderRadius: 12,
        padding: 20,
        textDecoration: "none",
        display: "block",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ color: "#666", fontSize: 13 }}>{stat.label}</span>
        <Icon size={18} color={stat.color} />
      </div>
      <p style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>
        {typeof stat.value === "number" ? stat.value.toLocaleString("sv-SE") : stat.value}
      </p>
    </Link>
  );
}

export default function DashboardStatCards({ stats }: { stats: Stat[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
      {stats.map(stat => <StatCard key={stat.label} stat={stat} />)}
    </div>
  );
}
