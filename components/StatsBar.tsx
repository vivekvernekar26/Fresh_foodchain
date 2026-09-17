"use client";

import { useEffect, useRef, useState } from "react";

type Batch = { risk: { status: string } };

const STATS = [
  { key: "transit",   label: "Batches in transit",   icon: "🚚", tone: "text-slate-200" },
  { key: "atRisk",    label: "At risk now",           icon: "⚠️", tone: "text-amber-400" },
  { key: "delivered", label: "Delivered fresh",       icon: "✅", tone: "text-emerald-400" },
  { key: "spoiled",   label: "Spoiled / discarded",   icon: "☠️", tone: "text-red-400" },
  { key: "wastePct",  label: "Waste-prevention rate", icon: "♻️", tone: "text-sky-400" },
] as const;

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const start = prev.current;
    const end   = value;
    const dur   = 400;
    const t0    = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setDisplayed(Math.round(start + (end - start) * p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{displayed}{suffix}</>;
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
  const atRisk = batches.filter((b) => b.risk.status !== "ok").length;
  const handled = delivered + spoiled;
  const wastePreventedPct = handled === 0 ? 0 : Math.round((delivered / handled) * 100);

  const values: Record<string, number> = {
    transit:   batches.length,
    atRisk,
    delivered,
    spoiled,
    wastePct:  wastePreventedPct,
  };

  const glowMap: Record<string, string> = {
    atRisk:    atRisk > 0 ? "var(--glow-warn)" : "none",
    delivered: "var(--glow-ok)",
    spoiled:   spoiled > 0 ? "var(--glow-crit)" : "none",
    wastePct:  "var(--glow-sky)",
    transit:   "none",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {STATS.map((s) => (
        <div
          key={s.key}
          className="glass rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]"
          style={{ boxShadow: glowMap[s.key] }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg leading-none">{s.icon}</span>
            <div className={`text-2xl font-bold tabular-nums ${s.tone}`}>
              <AnimatedNumber
                value={values[s.key]}
                suffix={s.key === "wastePct" ? "%" : ""}
              />
            </div>
          </div>
          <div className="text-xs text-slate-500 leading-tight">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
