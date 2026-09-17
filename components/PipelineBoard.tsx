import { STAGES, PRODUCTS } from "@/lib/simulation.js";
import type { Batch } from "@/lib/types";

const STAGE_META: Record<string, { emoji: string; color: string }> = {
  Farm:      { emoji: "🌾", color: "#84cc16" },
  Storage:   { emoji: "🏭", color: "#a78bfa" },
  Truck:     { emoji: "🚛", color: "#f59e0b" },
  Warehouse: { emoji: "🏪", color: "#38bdf8" },
  Shop:      { emoji: "🛒", color: "#34d399" },
  Customer:  { emoji: "👤", color: "#fb923c" },
};

const STATUS_RING: Record<string, string> = {
  ok:       "rgba(16,185,129,0.25)",
  warning:  "rgba(245,158,11,0.35)",
  critical: "rgba(239,68,68,0.4)",
};

const STATUS_BAR: Record<string, string> = {
  ok:       "linear-gradient(90deg, #10b981, #34d399)",
  warning:  "linear-gradient(90deg, #f59e0b, #fcd34d)",
  critical: "linear-gradient(90deg, #ef4444, #f87171)",
};

function BatchCard({ batch, onSelect }: { batch: Batch; onSelect: (id: number) => void }) {
  const cfg = PRODUCTS[batch.product];
  const status = batch.risk.status;
  return (
    <button
      id={`batch-card-${batch.id}`}
      onClick={() => onSelect(batch.id)}
      className="w-full rounded-xl p-2.5 text-left transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]"
      style={{
        background: "rgba(15,30,47,0.75)",
        border: `1px solid rgba(255,255,255,0.08)`,
        boxShadow: `0 0 0 1px ${STATUS_RING[status]}, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-300">
          {cfg.emoji} {cfg.label} <span className="text-slate-600">#{batch.id}</span>
        </span>
        {batch.fraud.fraudSuspected && (
          <span
            title={batch.fraud.reason ?? ""}
            className="text-xs leading-none"
            style={{ animation: "pulseGlow 1.8s ease infinite" }}
          >
            🚩
          </span>
        )}
      </div>

      {/* Risk bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${batch.risk.riskScore}%`,
            background: STATUS_BAR[status],
          }}
        />
      </div>

      {/* Shelf life */}
      <div className="mt-1 text-[10px] text-slate-600">
        {Math.max(0, Math.round(batch.risk.remainingShelfLifeHours))}h shelf life left ·{" "}
        <span
          style={{
            color: status === "ok" ? "var(--color-ok)" : status === "warning" ? "var(--color-warn)" : "var(--color-crit)",
          }}
        >
          {batch.risk.riskScore}%
        </span>
      </div>
    </button>
  );
}

export default function PipelineBoard({
  batches,
  onSelect,
}: {
  batches: Batch[];
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {STAGES.map((stage) => {
        const inStage = batches.filter((b) => b.stage === stage);
        const meta = STAGE_META[stage];
        const critCount = inStage.filter((b) => b.risk.status === "critical").length;
        const warnCount = inStage.filter((b) => b.risk.status === "warning").length;

        return (
          <div
            key={stage}
            className="flex flex-col rounded-xl"
            style={{
              background: "rgba(11,22,34,0.8)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Stage header */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-t-xl"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: `linear-gradient(135deg, ${meta.color}14, transparent)`,
              }}
            >
              <span className="text-xs font-semibold" style={{ color: meta.color }}>
                {meta.emoji} {stage}
              </span>
              <div className="flex items-center gap-1">
                {critCount > 0 && (
                  <span className="rounded px-1 text-[9px] font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>
                    {critCount}
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="rounded px-1 text-[9px] font-bold" style={{ background: "rgba(245,158,11,0.2)", color: "#fcd34d" }}>
                    {warnCount}
                  </span>
                )}
                <span className="text-[10px] text-slate-600">{inStage.length}</span>
              </div>
            </div>

            {/* Batch cards */}
            <div className="flex flex-col gap-1.5 p-2 flex-1">
              {inStage.map((b) => (
                <BatchCard key={b.id} batch={b} onSelect={onSelect} />
              ))}
              {inStage.length === 0 && (
                <p className="py-3 text-center text-[10px] text-slate-700">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
