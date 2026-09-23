"use client";

import type { AlertEvent } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type Filter = "active" | "log" | "all";

function formatTime(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `+${h}h ${m}m` : `+${h}h`;
}

export default function AlertsFeed({
  alerts,
  batchCount,
  onSelectBatch,
  onTriggerAIAnalysis,
}: {
  alerts: AlertEvent[];
  batchCount: number;
  onSelectBatch?: (id: number) => void;
  onTriggerAIAnalysis?: (id: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("active");

  const activeAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);

  const filtered =
    filter === "active"
      ? activeAlerts
      : filter === "log"
      ? resolvedAlerts
      : alerts;

  // Auto-scroll to top when new alerts arrive
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [alerts.length]);

  return (
    <div className="flex h-full flex-col rounded-lg bg-[#121215] border border-zinc-800 overflow-hidden text-zinc-100 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-[#18181b]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${activeAlerts.length > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Incident Operations
          </span>
        </div>
        <span className="text-[10px] font-mono-data text-zinc-400">
          Tracking {batchCount} units
        </span>
      </div>

      {/* Filter Tabs (Active vs Audit Log vs All) */}
      <div className="flex items-center gap-1 p-1.5 border-b border-zinc-800 bg-zinc-950/40">
        <button
          onClick={() => setFilter("active")}
          className={`flex-1 py-1 px-2 rounded text-[11px] font-mono-data font-medium transition-colors text-center ${
            filter === "active"
              ? "bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Active ({activeAlerts.length})
        </button>

        <button
          onClick={() => setFilter("log")}
          className={`flex-1 py-1 px-2 rounded text-[11px] font-mono-data font-medium transition-colors text-center ${
            filter === "log"
              ? "bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Audit Log ({resolvedAlerts.length})
        </button>

        <button
          onClick={() => setFilter("all")}
          className={`py-1 px-2 rounded text-[11px] font-mono-data font-medium transition-colors text-center ${
            filter === "all"
              ? "bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          All ({alerts.length})
        </button>
      </div>

      {/* Alert Cards Feed */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-2 max-h-[580px]"
      >
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 font-mono-data space-y-1">
            <div>
              {filter === "active"
                ? "✓ All cold-chain incidents resolved & logged."
                : filter === "log"
                ? "No resolved incidents logged yet."
                : "No incidents recorded."}
            </div>
            {filter === "active" && resolvedAlerts.length > 0 && (
              <button
                onClick={() => setFilter("log")}
                className="text-[11px] text-zinc-400 hover:underline pt-1"
              >
                View Audit Log ({resolvedAlerts.length}) →
              </button>
            )}
          </div>
        ) : (
          filtered.map((alert) => {
            const match = alert.text.match(/#(\d+)/);
            const batchId = alert.batchId ?? (match ? parseInt(match[1], 10) : null);
            const isResolved = Boolean(alert.resolved);

            return (
              <div
                key={alert.id}
                className={`group relative rounded p-2.5 transition-all ${
                  isResolved
                    ? "bg-zinc-950/40 border border-zinc-800/60 opacity-80"
                    : alert.severity === "critical"
                    ? "bg-zinc-900 border border-red-500/30"
                    : alert.severity === "warning"
                    ? "bg-zinc-900 border border-amber-500/30"
                    : "bg-zinc-900 border border-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    {isResolved ? (
                      <span className="text-[10px] font-mono-data font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                        <span>✓</span> Logged
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] font-mono-data font-semibold uppercase px-1.5 py-0.2 rounded ${
                          alert.severity === "critical"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : alert.severity === "warning"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono-data text-zinc-500 shrink-0">
                    {formatTime(alert.time)}
                  </span>
                </div>

                <p className={`text-xs leading-relaxed ${isResolved ? "text-zinc-400" : "text-zinc-200"}`}>
                  {alert.text}
                </p>

                {/* Actions */}
                {batchId && (
                  <div className="mt-2 flex items-center justify-end gap-2 border-t border-zinc-800/60 pt-1.5">
                    <button
                      onClick={() => onTriggerAIAnalysis?.(batchId)}
                      className={`text-[10px] font-mono-data font-medium px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                        isResolved
                          ? "text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 border border-zinc-700"
                          : "text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                      }`}
                    >
                      <span>{isResolved ? "View Log ↗" : "✨ AI Analysis"}</span>
                    </button>

                    {onSelectBatch && (
                      <button
                        onClick={() => onSelectBatch(batchId)}
                        className="text-[10px] font-mono-data text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors px-1 py-0.5"
                      >
                        <span>Inspect #{batchId}</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
