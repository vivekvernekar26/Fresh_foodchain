"use client";

import { STAGES, PRODUCTS } from "@/lib/simulation.js";
import type { Batch } from "@/lib/types";

const STAGE_CONFIG: Record<
  string,
  { label: string; emoji: string }
> = {
  Farm:      { label: "Farm Source",  emoji: "🌾" },
  Storage:   { label: "Cold Storage", emoji: "🏭" },
  Truck:     { label: "Transit",      emoji: "🚛" },
  Warehouse: { label: "Logistics Hub",emoji: "🏪" },
  Shop:      { label: "Retail Outlet",emoji: "🛒" },
  Customer:  { label: "Delivered",    emoji: "👤" },
};

function BatchFlightCard({
  batch,
  selected,
  onSelect,
}: {
  batch: Batch;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const cfg = (PRODUCTS as Record<string, { label: string; emoji: string; idealTemp: number }>)[batch.product];
  const status = batch.risk.status;
  const currentTemp = batch.temp ?? 0;

  return (
    <button
      id={`batch-card-${batch.id}`}
      onClick={() => onSelect(batch.id)}
      className={`group w-full rounded p-2.5 text-left transition-all ${
        selected
          ? "bg-zinc-800 border border-zinc-500 shadow-sm"
          : status === "critical"
          ? "bg-zinc-900/90 border border-red-500/40 hover:border-red-500/60"
          : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{cfg?.emoji ?? "📦"}</span>
          <span className="text-xs font-semibold text-zinc-100">
            {cfg?.label ?? batch.product}
          </span>
          <span className="text-[10px] font-mono-data text-zinc-400">
            #{batch.id}
          </span>
        </div>

        <span
          className={`text-[9px] font-mono-data font-semibold uppercase px-1.5 py-0.5 rounded ${
            status === "critical"
              ? "bg-red-500/20 text-red-300 border border-red-500/30"
              : status === "warning"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono-data text-zinc-400">
        <span>
          {currentTemp.toFixed(1)}°C
        </span>
        <span>
          {Math.max(0, Math.round(batch.risk.remainingShelfLifeHours))}h left
        </span>
      </div>
    </button>
  );
}

export default function PipelineBoard({
  batches,
  selectedBatchId,
  onSelect,
}: {
  batches: Batch[];
  selectedBatchId: number | null;
  onSelect: (id: number) => void;
}) {
  const byStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = batches.filter((b) => b.stage === stage);
      return acc;
    },
    {} as Record<string, Batch[]>
  );

  return (
    <div className="rounded-lg bg-[#121215] border border-zinc-800 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-100">
            Supply Chain Pipeline
          </h2>
          <span className="text-xs text-zinc-500 font-mono-data">
            ({batches.length} total units)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage] ?? { label: stage, emoji: "📦" };
          const stageBatches = byStage[stage] ?? [];

          return (
            <div
              key={stage}
              className="rounded bg-zinc-950/60 border border-zinc-800/80 p-2.5 flex flex-col min-h-[160px]"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <span>{config.emoji}</span>
                  <span>{config.label}</span>
                </div>
                <span className="text-[10px] font-mono-data font-semibold text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                  {stageBatches.length}
                </span>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[340px] custom-scrollbar">
                {stageBatches.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-zinc-600 font-mono-data">
                    Empty
                  </div>
                ) : (
                  stageBatches.map((batch) => (
                    <BatchFlightCard
                      key={batch.id}
                      batch={batch}
                      selected={selectedBatchId === batch.id}
                      onSelect={onSelect}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
