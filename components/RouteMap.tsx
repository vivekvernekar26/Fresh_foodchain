"use client";

import type { Batch } from "@/lib/types";

const STAGE_META = [
  { key: "Farm",      x: 85,  emoji: "🌾", label: "Farm Source",  color: "#71717a", glow: "rgba(255, 255, 255, 0.05)" },
  { key: "Storage",   x: 235, emoji: "🏭", label: "Cold Storage", color: "#71717a", glow: "rgba(255, 255, 255, 0.05)" },
  { key: "Truck",     x: 385, emoji: "🚛", label: "Transit",      color: "#71717a", glow: "rgba(255, 255, 255, 0.05)" },
  { key: "Warehouse", x: 535, emoji: "🏪", label: "Logistics Hub",color: "#71717a", glow: "rgba(255, 255, 255, 0.05)" },
  { key: "Shop",      x: 685, emoji: "🛒", label: "Retail Outlet",color: "#71717a", glow: "rgba(255, 255, 255, 0.05)" },
  { key: "Customer",  x: 835, emoji: "👤", label: "Delivered",    color: "#71717a", glow: "rgba(255, 255, 255, 0.05)" },
] as const;

const PRODUCT_STYLE: Record<string, { fill: string; stroke: string; emoji: string }> = {
  milk:      { fill: "#18181b", stroke: "#52525b", emoji: "🥛" },
  meat:      { fill: "#18181b", stroke: "#52525b", emoji: "🥩" },
  fruit:     { fill: "#18181b", stroke: "#52525b", emoji: "🍌" },
  vegetable: { fill: "#18181b", stroke: "#52525b", emoji: "🍅" },
};

type Props = {
  batches: Batch[];
  selectedBatchId?: number | null;
  onBatchClick: (batchId: number) => void;
};

// Generous spacing helper that guarantees zero collision between batch pods
function calculatePodPosition(stageX: number, idx: number, total: number, roadY: number) {
  if (total === 1) {
    return { bX: stageX, bY: roadY - 56 };
  }
  if (total === 2) {
    return {
      bX: stageX + (idx === 0 ? -34 : 34),
      bY: roadY - 56,
    };
  }
  if (total === 3) {
    if (idx === 0) return { bX: stageX - 34, bY: roadY - 56 };
    if (idx === 1) return { bX: stageX + 34, bY: roadY - 56 };
    return { bX: stageX, bY: roadY - 120 };
  }
  // 4 or more: 2 columns with generous vertical separation (64px) and horizontal gap (68px)
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  return {
    bX: stageX + (col === 0 ? -34 : 34),
    bY: roadY - 56 - row * 64,
  };
}

export default function RouteMap({ batches, selectedBatchId, onBatchClick }: Props) {
  const W = 920;
  const H = 340;
  const roadY = 210;

  // Group batches by stage
  const byStage = new Map<string, Batch[]>();
  STAGE_META.forEach((s) => byStage.set(s.key, []));
  batches.forEach((b) => byStage.get(b.stage)?.push(b));

  const truckBatches = byStage.get("Truck") ?? [];
  const inTransitCount = truckBatches.length;
  const criticalBatches = batches.filter((b) => b.risk.status === "critical");
  const fraudBatches = batches.filter((b) => b.fraud.fraudSuspected);

  return (
    <div className="relative overflow-hidden rounded-2xl glass-panel p-4 transition-all">
      {/* Top Header Row with Accurate Numbers */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 px-1 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-bold tracking-[0.18em] uppercase text-slate-300">
            Logistics Transit Corridor
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-500 font-mono-data">
            [6 Checkpoints]
          </span>
        </div>

        {/* Telemetry Numbers Breakdown */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-[11px] font-mono-data text-slate-400">
          <span className="flex items-center gap-1">
            <span>In Road Transit:</span>
            <strong className="text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
              {inTransitCount}
            </strong>
          </span>

          <span className="text-slate-600">|</span>

          <span className="flex items-center gap-1">
            <span>Total Fleet:</span>
            <strong className="text-slate-200 font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
              {batches.length}
            </strong>
          </span>

          {criticalBatches.length > 0 && (
            <span className="text-rose-400 font-bold animate-pulse">
              🚨 {criticalBatches.length} Critical
            </span>
          )}
          {fraudBatches.length > 0 && (
            <span className="text-amber-400 font-bold">
              🚩 {fraudBatches.length} Tamper Alert
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto custom-scrollbar pt-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[760px] select-none"
          style={{ overflow: "visible" }}
          aria-label="Interactive Supply Chain Route Map"
        >
          <defs>
            {/* High-tech grid background */}
            <pattern id="transitGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.75" />
            </pattern>

            {/* Glowing filter */}
            <filter id="corridorGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Selection filter */}
            <filter id="selectGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Energy pulse gradient */}
            <linearGradient id="energyConduit" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#84cc16" stopOpacity="0.8" />
              <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>

            {/* Alarm glow */}
            <filter id="alarmPulse" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background grid */}
          <rect width={W} height={H} fill="url(#transitGrid)" rx={12} />

          {/* ── Transit Conduit Road ── */}
          <line
            x1={60} y1={roadY} x2={860} y2={roadY}
            stroke="#070d17" strokeWidth={36} strokeLinecap="round"
          />
          <line
            x1={60} y1={roadY} x2={860} y2={roadY}
            stroke="#101d2e" strokeWidth={24} strokeLinecap="round"
          />
          <line
            x1={65} y1={roadY} x2={855} y2={roadY}
            stroke="url(#energyConduit)" strokeWidth={3} strokeLinecap="round" opacity={0.65}
          />
          <line
            x1={65} y1={roadY} x2={855} y2={roadY}
            stroke="#ffffff" strokeWidth={2} strokeLinecap="round"
            strokeDasharray="14 36" opacity={0.4}
          >
            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="3s" repeatCount="indefinite" />
          </line>

          {/* Directional Chevrons */}
          {STAGE_META.slice(0, -1).map((stage, i) => {
            const next = STAGE_META[i + 1];
            const midX = (stage.x + next.x) / 2;
            return (
              <polygon
                key={`chevron-${stage.key}`}
                points={`${midX - 5},${roadY - 5} ${midX + 5},${roadY} ${midX - 5},${roadY + 5}`}
                fill="rgba(6, 182, 212, 0.45)"
              />
            );
          })}

          {/* ── Stage Terminals ── */}
          {STAGE_META.map((stage) => {
            const here = byStage.get(stage.key) ?? [];
            const active = here.length > 0;
            const hasCritical = here.some((b) => b.risk.status === "critical");
            const R = 22;

            return (
              <g key={stage.key}>
                {/* Critical Alarm Pulsing Rings */}
                {hasCritical && (
                  <>
                    <circle cx={stage.x} cy={roadY} r={36} fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.8" filter="url(#alarmPulse)">
                      <animate attributeName="r" values="30;46;30" dur="1.8s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={stage.x} cy={roadY} r={28} fill="rgba(244,63,94,0.18)" stroke="#f43f5e" strokeWidth="1" />
                  </>
                )}

                {/* Node outer glow */}
                {active && !hasCritical && (
                  <circle cx={stage.x} cy={roadY} r={28} fill={stage.glow} opacity={0.8} />
                )}

                {/* Main station node */}
                <circle
                  cx={stage.x}
                  cy={roadY}
                  r={R}
                  fill={active ? "rgba(15, 27, 44, 0.95)" : "rgba(10, 18, 30, 0.8)"}
                  stroke={hasCritical ? "#f43f5e" : active ? stage.color : "rgba(255,255,255,0.12)"}
                  strokeWidth={active ? 2.5 : 1}
                  filter={active ? "url(#corridorGlow)" : undefined}
                />

                {/* Station emoji icon */}
                <text x={stage.x} y={roadY + 6} textAnchor="middle" fontSize={17}>
                  {stage.emoji}
                </text>

                {/* Station label (below conduit) */}
                <text
                  x={stage.x}
                  y={roadY + 44}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                  fill={hasCritical ? "#f43f5e" : active ? "#e2e8f0" : "#64748b"}
                >
                  {stage.label}
                </text>

                {/* Station Batch Count Badge */}
                <g>
                  <rect
                    x={stage.x - 14}
                    y={roadY + 54}
                    width={28}
                    height={16}
                    rx={8}
                    fill={active ? "rgba(6, 182, 212, 0.18)" : "rgba(255, 255, 255, 0.05)"}
                    stroke={active ? "rgba(6, 182, 212, 0.45)" : "rgba(255, 255, 255, 0.1)"}
                    strokeWidth={1}
                  />
                  <text
                    x={stage.x}
                    y={roadY + 65.5}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                    fill={active ? "#38bdf8" : "#64748b"}
                  >
                    {here.length}
                  </text>
                </g>

                {/* ── Active Batches in this Stage (Hovering Above Conduit) ── */}
                {here.map((batch, idx) => {
                  const { bX, bY } = calculatePodPosition(stage.x, idx, here.length, roadY);
                  const pStyle = PRODUCT_STYLE[batch.product] ?? PRODUCT_STYLE.milk;
                  const isCritical = batch.risk.status === "critical";
                  const isFraud = batch.fraud.fraudSuspected;
                  const isWarn = batch.risk.status === "warning";
                  const isSelected = selectedBatchId === batch.id;

                  return (
                    <g
                      key={batch.id}
                      style={{ cursor: "pointer", pointerEvents: "all" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBatchClick(batch.id);
                      }}
                      role="button"
                      aria-label={`Inspect batch #${batch.id}`}
                      className="group/pod"
                    >
                      {/* Invisible generous hit-target covering entire pod, halo, and #ID label */}
                      <rect
                        x={bX - 26}
                        y={bY - 32}
                        width={52}
                        height={58}
                        rx={14}
                        fill="white"
                        fillOpacity={0}
                        style={{ pointerEvents: "all", cursor: "pointer" }}
                      />

                      {/* Connection beam to station */}
                      <line
                        x1={bX}
                        y1={bY + 16}
                        x2={stage.x}
                        y2={roadY - R - 2}
                        stroke={isCritical ? "#ef4444" : isSelected ? "#d4d4d8" : "rgba(255,255,255,0.08)"}
                        strokeWidth={isSelected ? 1.5 : 1}
                        strokeDasharray="2 3"
                        className="pointer-events-none"
                      />

                      {/* Selected batch halo */}
                      {isSelected && (
                        <circle
                          cx={bX}
                          cy={bY}
                          r={22}
                          fill="none"
                          stroke="#e4e4e7"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          opacity={0.9}
                          className="pointer-events-none"
                        />
                      )}

                      {/* Critical alert ring */}
                      {isCritical && !isSelected && (
                        <circle cx={bX} cy={bY} r={21} fill="none" stroke="#ef4444" strokeWidth="1.5" className="pointer-events-none" />
                      )}

                      {/* Warning halo */}
                      {isWarn && !isCritical && !isSelected && (
                        <circle
                          cx={bX}
                          cy={bY}
                          r={20}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          opacity={0.6}
                          className="pointer-events-none"
                        />
                      )}

                      {/* Batch Container Pod Rect — Visual highlight on hover without geometry shift */}
                      <rect
                        x={bX - 16}
                        y={bY - 16}
                        width={32}
                        height={32}
                        rx={10}
                        fill={isCritical ? "rgba(244,63,94,0.25)" : isSelected ? "rgba(6,182,212,0.25)" : pStyle.fill}
                        stroke={isSelected ? "#06b6d4" : isCritical ? "#f43f5e" : isWarn ? "#f59e0b" : pStyle.stroke}
                        strokeWidth={isSelected ? 2.5 : isCritical ? 2.5 : 1.5}
                        filter={isCritical ? "url(#alarmPulse)" : isSelected ? "url(#selectGlow)" : undefined}
                        className="transition-all duration-150 group-hover/pod:brightness-125"
                      />

                      {/* Batch emoji */}
                      <text x={bX} y={bY + 5} textAnchor="middle" fontSize={15} className="select-none pointer-events-none">
                        {pStyle.emoji}
                      </text>

                      {/* Batch ID Tag Pill Background */}
                      <rect
                        x={bX - 16}
                        y={bY - 29}
                        width={32}
                        height={12}
                        rx={6}
                        fill="rgba(6, 9, 14, 0.85)"
                        stroke={isSelected ? "#06b6d4" : "rgba(255,255,255,0.15)"}
                        strokeWidth={0.8}
                        className="select-none pointer-events-none"
                      />

                      {/* Batch ID Tag */}
                      <text
                        x={bX}
                        y={bY - 20}
                        textAnchor="middle"
                        fontSize={9}
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight={isSelected ? "700" : "600"}
                        fill={isSelected ? "#38bdf8" : isCritical ? "#fca5a5" : "#94a3b8"}
                        className="select-none pointer-events-none"
                      >
                        #{batch.id}
                      </text>

                      {/* Anomaly / Fraud Warning Indicator */}
                      {(isFraud || isCritical) && (
                        <text x={bX + 11} y={bY - 8} fontSize={11} className="select-none pointer-events-none">
                          🚨
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic CTA Banner when critical batches exist */}
      {criticalBatches.length > 0 && (
        <div
          onClick={() => onBatchClick(criticalBatches[0].id)}
          className="mt-3 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all hover:scale-[1.01]"
          style={{
            background: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.4)",
            color: "#fca5a5",
            animation: "pulseGlow 2.5s infinite",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">⚠️</span>
            <span>
              {criticalBatches.length} critical batch{criticalBatches.length > 1 ? "es" : ""} require immediate intervention
            </span>
          </div>
          <span className="text-[11px] font-mono-data bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/40">
            Click to Inspect →
          </span>
        </div>
      )}
    </div>
  );
}
