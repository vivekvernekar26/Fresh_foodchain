"use client";

import type { AlertEvent } from "@/lib/types";
import { useEffect, useRef } from "react";

const SEVERITY_STYLE: Record<
  AlertEvent["severity"],
  { border: string; bg: string; text: string; dot: string }
> = {
  ok:       { border: "#334155", bg: "rgba(30,41,59,0.5)",   text: "#94a3b8", dot: "#64748b" },
  warning:  { border: "#92400e", bg: "rgba(69,26,3,0.45)",   text: "#fcd34d", dot: "#f59e0b" },
  critical: { border: "#7f1d1d", bg: "rgba(69,10,10,0.45)",  text: "#fca5a5", dot: "#ef4444" },
};

function formatTime(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `+${h}h ${m}m` : `+${h}h`;
}

export default function AlertsFeed({ alerts }: { alerts: AlertEvent[] }) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new alerts arrive
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [alerts.length]);

  return (
    <div
      className="flex h-full flex-col rounded-xl overflow-hidden"
      style={{ background: "rgba(11,22,34,0.85)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span className="text-sm font-semibold text-slate-200">Live Alerts</span>
        <div className="flex items-center gap-1.5">
          <span
            className="block h-2 w-2 rounded-full"
            style={{
              background: "var(--color-ok)",
              animation: "pulseDot 1.8s ease-in-out infinite",
            }}
          />
          <span className="text-[10px] text-slate-500">watching</span>
        </div>
      </div>

      {/* Alert list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {alerts.length === 0 && (
          <p className="p-3 text-xs text-slate-600 text-center leading-relaxed">
            Monitoring 3 batches…<br />
            <span className="text-slate-700">Alerts will appear here when an anomaly is detected.</span>
          </p>
        )}
        {alerts.slice(0, 3).map((a, i) => {
          const s = SEVERITY_STYLE[a.severity];
          return (
            <div
              key={a.id}
              id={`alert-${a.id}`}
              className="rounded-lg px-2.5 py-2 text-xs animate-slide-in"
              style={{
                animationDelay: i === 0 ? "0ms" : undefined,
                borderLeft: `3px solid ${s.border}`,
                background: s.bg,
                color: s.text,
              }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: s.dot }}
                />
                <div>
                  <span className="text-slate-600">{formatTime(a.time)}</span>{" "}
                  {a.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
