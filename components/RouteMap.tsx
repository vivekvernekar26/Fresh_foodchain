"use client";

import type { Batch } from "@/lib/types";

const STAGE_META = [
  { key: "Farm",      x: 80,  emoji: "🌾", label: "Farm",      color: "#84cc16", bgColor: "rgba(132,204,22,0.12)"  },
  { key: "Storage",   x: 230, emoji: "🏭", label: "Storage",   color: "#a78bfa", bgColor: "rgba(167,139,250,0.12)" },
  { key: "Truck",     x: 380, emoji: "🚛", label: "Truck",     color: "#f59e0b", bgColor: "rgba(245,158,11,0.12)"  },
  { key: "Warehouse", x: 530, emoji: "🏪", label: "Warehouse", color: "#38bdf8", bgColor: "rgba(56,189,248,0.12)"  },
  { key: "Shop",      x: 680, emoji: "🛒", label: "Shop",      color: "#34d399", bgColor: "rgba(52,211,153,0.12)"  },
  { key: "Customer",  x: 830, emoji: "👤", label: "Customer",  color: "#fb923c", bgColor: "rgba(251,146,60,0.12)"  },
] as const;

const PRODUCT_STYLE: Record<string, { fill: string; stroke: string; emoji: string }> = {
  milk:      { fill: "rgba(59,130,246,0.25)",  stroke: "#3b82f6", emoji: "🥛" },
  meat:      { fill: "rgba(239,68,68,0.25)",   stroke: "#ef4444", emoji: "🥩" },
  fruit:     { fill: "rgba(34,197,94,0.25)",   stroke: "#22c55e", emoji: "🍌" },
  vegetable: { fill: "rgba(234,179,8,0.25)",   stroke: "#eab308", emoji: "🍅" },
};

type Props = {
  batches: Batch[];
  anomalyFired: boolean;
  anomalyBatchId: number | null;
  onAnomalyClick: () => void;
};

export default function RouteMap({ batches, anomalyFired, anomalyBatchId, onAnomalyClick }: Props) {
  const W = 910;
  const H = 300;
  const roadY = 165;

  // Group batches by stage (Customer is terminal — skip drawing)
  const byStage = new Map<string, Batch[]>();
  STAGE_META.forEach(s => byStage.set(s.key, []));
  batches.forEach(b => byStage.get(b.stage)?.push(b));

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "12px 8px",
      }}
    >
      {/* Section title */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.2em] text-slate-600 uppercase">
          Supply Chain Route — Live View
        </span>
        <span className="text-[10px] text-slate-700">
          Farm → Storage → Truck → Warehouse → Shop → Customer
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", overflow: "visible" }}
        aria-label="Supply chain route map"
      >
        <defs>
          {/* Map grid */}
          <pattern id="mapgrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.022)" strokeWidth="0.6" />
          </pattern>

          {/* Glow filter */}
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Route progress gradient */}
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#84cc16" stopOpacity="0.7" />
            <stop offset="40%"  stopColor="#f59e0b" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.7" />
          </linearGradient>

          {/* Anomaly glow */}
          <filter id="anomalyGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <rect width={W} height={H} fill="url(#mapgrid)" />

        {/* ── Road ── */}
        {/* Shadow */}
        <line x1={60} y1={roadY} x2={850} y2={roadY}
          stroke="rgba(0,0,0,0.55)" strokeWidth={42} strokeLinecap="round" />
        {/* Tarmac */}
        <line x1={60} y1={roadY} x2={850} y2={roadY}
          stroke="#0d1b2a" strokeWidth={30} strokeLinecap="round" />
        {/* Road surface shine */}
        <line x1={60} y1={roadY - 6} x2={850} y2={roadY - 6}
          stroke="rgba(255,255,255,0.03)" strokeWidth={8} strokeLinecap="round" />
        {/* Centre dashes */}
        <line x1={60} y1={roadY} x2={850} y2={roadY}
          stroke="rgba(255,255,255,0.10)" strokeWidth={1.5}
          strokeDasharray="22 14" strokeLinecap="round" />

        {/* Direction arrows between stages */}
        {STAGE_META.slice(0, -1).map((stage, i) => {
          const next = STAGE_META[i + 1];
          const midX = (stage.x + next.x) / 2;
          return (
            <polygon
              key={stage.key}
              points={`${midX - 4},${roadY - 5} ${midX + 4},${roadY} ${midX - 4},${roadY + 5}`}
              fill="rgba(255,255,255,0.08)"
            />
          );
        })}

        {/* ── Stage nodes ── */}
        {STAGE_META.map(stage => {
          const here = byStage.get(stage.key) ?? [];
          const active = here.length > 0;
          const isAnomalyStage = anomalyFired && stage.key === "Truck";
          const ROAD_R = 24;

          return (
            <g key={stage.key}>
              {/* Anomaly pulsing rings */}
              {isAnomalyStage && (
                <>
                  <circle cx={stage.x} cy={roadY} r={38} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" filter="url(#anomalyGlow)">
                    <animate attributeName="r" values="34;48;34" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={stage.x} cy={roadY} r={30} fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="1">
                    <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Node ambient glow when active */}
              {active && (
                <circle cx={stage.x} cy={roadY} r={30} fill={stage.bgColor} opacity="0.7" />
              )}

              {/* Node circle */}
              <circle
                cx={stage.x}
                cy={roadY}
                r={ROAD_R}
                fill={active ? stage.bgColor : "rgba(11,22,34,0.9)"}
                stroke={isAnomalyStage ? "#ef4444" : active ? stage.color : "rgba(255,255,255,0.10)"}
                strokeWidth={active ? 2 : 1}
                filter={active ? "url(#nodeGlow)" : undefined}
              />

              {/* Node emoji */}
              <text x={stage.x} y={roadY + 7} textAnchor="middle" fontSize={18}>
                {stage.emoji}
              </text>

              {/* Stage label (below road) */}
              <text
                x={stage.x}
                y={roadY + 52}
                textAnchor="middle"
                fontSize={10}
                fontWeight="600"
                fontFamily="Inter, sans-serif"
                fill={isAnomalyStage ? "#ef4444" : active ? stage.color : "#475569"}
              >
                {stage.label}
              </text>

              {/* Batch count badge */}
              {here.length > 1 && (
                <g>
                  <circle cx={stage.x + 18} cy={roadY - 18} r={8} fill={stage.color} />
                  <text x={stage.x + 18} y={roadY - 14} textAnchor="middle" fontSize={8} fill="#000" fontWeight="700">
                    {here.length}
                  </text>
                </g>
              )}

              {/* ── Batch markers (above road) ── */}
              {here.map((batch, idx) => {
                const bY = roadY - 78 - idx * 46;
                const style = PRODUCT_STYLE[batch.product] ?? PRODUCT_STYLE.milk;
                const isAnomalyBatch = batch.id === anomalyBatchId;
                const riskStatus = batch.risk?.status ?? "ok";

                return (
                  <g
                    key={batch.id}
                    style={{ cursor: isAnomalyBatch ? "pointer" : "default" }}
                    onClick={isAnomalyBatch ? onAnomalyClick : undefined}
                    role={isAnomalyBatch ? "button" : undefined}
                    aria-label={isAnomalyBatch ? "Click to analyse anomaly" : undefined}
                  >
                    {/* Connector line */}
                    <line
                      x1={stage.x} y1={bY + 20}
                      x2={stage.x} y2={roadY - ROAD_R - 2}
                      stroke={isAnomalyBatch ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.06)"}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />

                    {/* Anomaly outer ring */}
                    {isAnomalyBatch && (
                      <circle cx={stage.x} cy={bY} r={24} fill="none" stroke="#ef4444" strokeWidth="1.5">
                        <animate attributeName="r" values="22;30;22" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0;1" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Risk ring */}
                    {riskStatus !== "ok" && !isAnomalyBatch && (
                      <circle cx={stage.x} cy={bY} r={22}
                        fill="none"
                        stroke={riskStatus === "critical" ? "#ef4444" : "#f59e0b"}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        opacity={0.5}
                      />
                    )}

                    {/* Batch circle */}
                    <circle
                      cx={stage.x}
                      cy={bY}
                      r={20}
                      fill={isAnomalyBatch ? "rgba(239,68,68,0.3)" : style.fill}
                      stroke={isAnomalyBatch ? "#ef4444" : style.stroke}
                      strokeWidth={isAnomalyBatch ? 2.5 : 1.5}
                      filter={isAnomalyBatch ? "url(#anomalyGlow)" : undefined}
                    />

                    {/* Product emoji */}
                    <text x={stage.x} y={bY + 7} textAnchor="middle" fontSize={15}>
                      {style.emoji}
                    </text>

                    {/* Batch label */}
                    <text
                      x={stage.x}
                      y={bY - 27}
                      textAnchor="middle"
                      fontSize={9}
                      fontFamily="Inter, sans-serif"
                      fontWeight="500"
                      fill={isAnomalyBatch ? "#fca5a5" : "#64748b"}
                    >
                      #{batch.id}
                    </text>

                    {/* Anomaly badge */}
                    {isAnomalyBatch && (
                      <>
                        <text x={stage.x + 18} y={bY - 10} fontSize={13}>⚠️</text>
                        <text
                          x={stage.x}
                          y={bY + 36}
                          textAnchor="middle"
                          fontSize={8}
                          fontFamily="Inter, sans-serif"
                          fontWeight="700"
                          fill="#f87171"
                        >
                          BREACH
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Legend */}
        <text x={W / 2} y={16} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.18)" fontFamily="Inter,sans-serif" letterSpacing={4}>
          LIVE ROUTE TRACKING
        </text>
      </svg>

      {/* Click-to-analyse CTA overlay */}
      {anomalyFired && (
        <button
          id="anomaly-cta-btn"
          onClick={onAnomalyClick}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.5)",
            color: "#fca5a5",
            boxShadow: "0 0 24px rgba(239,68,68,0.2)",
            animation: "pulseGlow 2.2s ease infinite",
          }}
        >
          <span>⚠️</span>
          <span>Cold Chain Breach detected on Truck — Click to Analyse with AI</span>
          <span>→</span>
        </button>
      )}
    </div>
  );
}
