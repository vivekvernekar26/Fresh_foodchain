"use client";

import { useEffect, useRef, useState } from "react";
import type { Batch } from "@/lib/types";

const STATS_CONFIG = [
  {
    key: "transit",
    label: "In Transit",
    icon: "🚛",
    tag: "ACTIVE",
  },
  {
    key: "atRisk",
    label: "Cold-Chain Breaches",
    icon: "⚠️",
    tag: "ALERT",
  },
  {
    key: "delivered",
    label: "Delivered Units",
    icon: "📦",
    tag: "COMPLETED",
  },
  {
    key: "spoiled",
    label: "Spoilage Losses",
    icon: "✕",
    tag: "LOSS",
  },
  {
    key: "wastePct",
    label: "Fleet Integrity",
    icon: "🛡️",
    tag: "EFFICIENCY",
  },
] as const;

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const start = prev.current;
    const end = value;
    const startTime = performance.now();
    const duration = 400;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const current = Math.round(start + (end - start) * progress);
      setDisplayed(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        prev.current = end;
      }
    }

    requestAnimationFrame(step);
  }, [value]);

  return (
    <span>
      {displayed}
      {suffix}
    </span>
  );
}

export default function StatsBar({
  batches,
  delivered,
  spoiled,
}: {
  batches: Batch[];
  delivered: number;
  spoiled: number;
}) {
  const inTransit = batches.filter((b) => b.stage === "Truck").length;
  const atRisk = batches.filter(
    (b) => b.risk.status === "warning" || b.risk.status === "critical"
  ).length;

  const totalClosed = delivered + spoiled;
  const integrityPct =
    totalClosed === 0
      ? 100
      : Math.round((delivered / totalClosed) * 100);

  const values: Record<string, number> = {
    transit: inTransit,
    atRisk,
    delivered,
    spoiled,
    wastePct: integrityPct,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {STATS_CONFIG.map((stat) => {
        const val = values[stat.key];
        const isIntegrity = stat.key === "wastePct";

        return (
          <div
            key={stat.key}
            className="rounded-lg p-3.5 bg-[#121215] border border-zinc-800 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">{stat.icon}</span>
              <span className="text-[10px] font-mono-data font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                {stat.tag}
              </span>
            </div>

            <div className="text-2xl font-bold font-mono-data text-zinc-100 tracking-tight">
              <AnimatedNumber value={val} suffix={isIntegrity ? "%" : ""} />
            </div>

            <div className="text-xs text-zinc-400 font-medium mt-0.5">
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
