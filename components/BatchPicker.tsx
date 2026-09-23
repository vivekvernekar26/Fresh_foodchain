"use client";

import type { Batch } from "@/lib/types";
import { PRODUCTS } from "@/lib/simulation.js";

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  ok:       { bg: "rgba(16, 185, 129, 0.12)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
  warning:  { bg: "rgba(245, 158, 11, 0.12)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
  critical: { bg: "rgba(244, 63, 94, 0.16)",  text: "#fb7185", border: "rgba(244, 63, 94, 0.4)" },
};

export default function BatchPicker({
  batches,
  onSelect,
  onClose,
}: {
  batches: Batch[];
  onSelect: (batch: Batch) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ background: "rgba(6, 9, 14, 0.8)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden glass-panel animate-slide-up border border-rose-500/40 shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(244,63,94,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              ⚡ Inject Cold-Chain Incident
            </h3>
          </div>
          <button
            id="batch-picker-close"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* Info banner */}
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-[11px] text-rose-300 font-medium">
          Select target cargo below to force immediate refrigeration breakdown &amp; VOC gas spikes on next simulation tick.
        </div>

        {/* Batches List */}
        <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar">
          {batches.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-8 font-mono-data">
              No active batches in pipeline
            </p>
          ) : (
            batches.map((batch) => {
              const cfg = (PRODUCTS as Record<string, { label: string; emoji: string }>)[batch.product];
              const badge = STATUS_STYLE[batch.risk.status] ?? STATUS_STYLE.ok;

              return (
                <button
                  key={batch.id}
                  id={`picker-batch-${batch.id}`}
                  onClick={() => {
                    onSelect(batch);
                    onClose();
                  }}
                  className="group w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-150 bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 hover:border-rose-500/40 hover:scale-[1.01]"
                >
                  <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                    {cfg.emoji}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {cfg.label}
                      </span>
                      <span className="text-[11px] font-mono-data text-cyan-400">
                        #{batch.id}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono-data mt-0.5">
                      Stage: <span className="text-slate-300">{batch.stage}</span> · {batch.temp.toFixed(1)}°C
                    </div>
                  </div>

                  <div
                    className="text-[10px] font-mono-data font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0"
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {batch.risk.status}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 bg-slate-950/60 text-center">
          <span className="text-[10px] text-slate-500 font-mono-data">
            Telemetry will log anomaly to AI diagnostics and incident feed
          </span>
        </div>
      </div>
    </div>
  );
}
