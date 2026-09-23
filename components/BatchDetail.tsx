"use client";

import { PRODUCTS, SHOPS, recommendDestination, analyzeAnomaly } from "@/lib/simulation.js";
import type { Batch, AnomalyAnalysis } from "@/lib/types";
import SensorGauge from "./SensorGauge";

const analyzeAnomalyFn = analyzeAnomaly as unknown as (batch: Batch) => AnomalyAnalysis;
const recommendDestinationFn = recommendDestination as unknown as (
  batch: Batch,
  shops: typeof SHOPS,
  now: number
) => (typeof SHOPS)[number] & { demand: number; stock: number; score: number };

/* ── Sparkline with Clean Line ───────────────────────────────────────────── */
function Sparkline({
  values,
  ideal,
  label,
  unit,
}: {
  values: number[];
  ideal: number;
  label: string;
  unit: string;
}) {
  const safeValues = values.length >= 2 ? values : values.length === 1 ? [values[0], values[0]] : [ideal, ideal];
  const min = Math.min(...safeValues, ideal) * 0.92;
  const max = Math.max(...safeValues, ideal) * 1.08 || 1;
  const range = max - min || 1;
  const W = 100, H = 34;
  const toX = (i: number) => (i / (safeValues.length - 1)) * W;
  const toY = (v: number) => H - ((v - min) / range) * (H - 6) - 3;

  const linePoints = safeValues.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const idealY = toY(ideal);

  return (
    <div className="rounded p-2 bg-zinc-900/60 border border-zinc-800">
      <div className="flex items-center justify-between mb-1 text-xs">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className="font-mono-data font-semibold text-zinc-200">
          {values[values.length - 1].toFixed(1)}{unit}
          <span className="text-zinc-500 font-normal ml-1">(ideal {ideal}{unit})</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 34 }} preserveAspectRatio="none">
        <line
          x1="0" y1={idealY} x2={W} y2={idealY}
          stroke="#3f3f46"
          strokeWidth="0.8"
          strokeDasharray="2 3"
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke="#d4d4d8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle
          cx={toX(values.length - 1)}
          cy={toY(values[values.length - 1])}
          r="2"
          fill="#d4d4d8"
        />
      </svg>
    </div>
  );
}

/* ── Main Batch Detail Component ─────────────────────────────────────────── */
export default function BatchDetail({
  batch,
  now,
  onClose,
  onInjectAnomaly,
  onOpenAIModal,
  isResolved,
}: {
  batch: Batch;
  now: number;
  onClose: () => void;
  onInjectAnomaly?: () => void;
  onOpenAIModal?: (batch: Batch) => void;
  isResolved?: boolean;
}) {
  const cfg = PRODUCTS[batch.product];
  const destination = recommendDestinationFn(batch, SHOPS, now);
  const ruleAnalysis = analyzeAnomalyFn(batch);
  const shelfLeft = Math.max(0, Math.round(batch.risk.remainingShelfLifeHours));

  const hasAnomaly =
    !isResolved &&
    (batch.fraud.fraudSuspected ||
      batch.risk.status === "critical" ||
      batch.risk.status === "warning" ||
      batch.temp > cfg.idealTemp + 3.5 ||
      batch.gas > cfg.idealGas + 4);

  return (
    <div className="rounded-lg bg-[#121215] border border-zinc-800 shadow-xl overflow-hidden animate-slide-up flex flex-col h-full text-zinc-100">
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-800 bg-[#18181b]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{cfg.emoji}</span>
              <h3 className="text-sm font-semibold text-zinc-100">
                {cfg.label}
                <span className="ml-1 font-mono-data font-normal text-zinc-400">
                  #{batch.id}
                </span>
              </h3>
              <span className="text-[10px] font-mono-data font-semibold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {isResolved ? "RESOLVED & LOGGED" : batch.risk.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-1 font-mono-data">
              <span>Location: <strong className="text-zinc-300 font-sans">{batch.stage}</strong></span>
              <span>·</span>
              <span>In Stage: <strong className="text-zinc-300">{Math.max(0, now - batch.stageEnteredAt).toFixed(1)}h</strong></span>
            </div>
          </div>

          <button
            id="batch-detail-close"
            onClick={onClose}
            className="rounded w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3.5">
        
        {/* ── AI Anomaly Action Card ── */}
        <div className="rounded p-3 bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-zinc-200">
              AI Diagnostics Engine
            </div>
            {isResolved ? (
              <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-semibold border border-emerald-800">
                ✓ RESOLVED &amp; LOGGED
              </span>
            ) : hasAnomaly ? (
              <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
                INCIDENT ACTIVE
              </span>
            ) : null}
          </div>

          <button
            onClick={() => onOpenAIModal?.(batch)}
            className="w-full flex items-center justify-center gap-2 rounded py-2 px-3 text-xs font-mono-data font-semibold bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            <span>{isResolved ? "View Incident Audit Report" : "Open AI Diagnostics Window"}</span>
            <span>↗</span>
          </button>
        </div>

        {/* Real-time Sensor Gauges */}
        <div className="grid grid-cols-3 gap-2">
          <SensorGauge
            value={batch.temp}
            min={-5}
            max={35}
            ideal={cfg.idealTemp}
            unit="°C"
            label="Thermal"
          />
          <SensorGauge
            value={batch.humidity}
            min={20}
            max={100}
            ideal={cfg.idealHumidity}
            unit="%"
            label="Moisture"
          />
          <SensorGauge
            value={batch.gas}
            min={0}
            max={40}
            ideal={cfg.idealGas}
            unit="ppm"
            label="Gas / VOC"
          />
        </div>

        {/* Risk & Spoilage Metrics Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded p-2.5 bg-zinc-900/60 border border-zinc-800">
            <div className="text-[10px] uppercase font-medium text-zinc-400 mb-1">
              Spoilage Index
            </div>
            <div className="text-lg font-semibold font-mono-data text-zinc-100">
              {batch.risk.riskScore}%
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-zinc-300 rounded-full"
                style={{ width: `${Math.min(100, batch.risk.riskScore)}%` }}
              />
            </div>
          </div>

          <div className="rounded p-2.5 bg-zinc-900/60 border border-zinc-800">
            <div className="text-[10px] uppercase font-medium text-zinc-400 mb-1">
              Residual Life
            </div>
            <div className="text-lg font-semibold font-mono-data text-zinc-100">
              {shelfLeft}h
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-zinc-300 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, (shelfLeft / cfg.baselineShelfLifeHours) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Telemetry Trajectories (Sparklines) */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            Telemetry Trajectory
          </div>
          <div className="space-y-1.5">
            <Sparkline
              values={batch.history.map((h) => h.temp)}
              ideal={cfg.idealTemp}
              label="Thermal"
              unit="°C"
            />
            <Sparkline
              values={batch.history.map((h) => h.humidity)}
              ideal={cfg.idealHumidity}
              label="Moisture"
              unit="%"
            />
            <Sparkline
              values={batch.history.map((h) => h.gas)}
              ideal={cfg.idealGas}
              label="Gas / VOC"
              unit="ppm"
            />
          </div>
        </div>

        {/* Fast Baseline Summary */}
        <div className="rounded p-2.5 bg-zinc-900/60 border border-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono-data text-zinc-400">
            <span className="font-semibold uppercase tracking-wider">Baseline Telemetry Status</span>
            <span className="text-zinc-300 font-semibold">{ruleAnalysis.confidence}% Match</span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {ruleAnalysis.summary}
          </p>
        </div>

        {/* Dynamic Route Optimization */}
        <div className="rounded p-3 bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Optimal Reroute Target
            </div>
            <span className="text-[10px] font-mono-data font-semibold text-zinc-400">
              Match
            </span>
          </div>

          <div className="text-sm font-semibold text-zinc-100">
            {destination.name}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded p-2 bg-zinc-950/60 border border-zinc-800">
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Demand</span>
                <span className="font-mono-data text-zinc-200 font-semibold">{destination.demand}/5</span>
              </div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-zinc-300"
                  style={{ width: `${(destination.demand / 5) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded p-2 bg-zinc-950/60 border border-zinc-800">
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Stock</span>
                <span className="font-mono-data text-zinc-200 font-semibold">{destination.stock}/5</span>
              </div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-zinc-400"
                  style={{ width: `${(destination.stock / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Force Anomaly Trigger */}
        {onInjectAnomaly && (
          <button
            id="batch-detail-inject"
            onClick={() => {
              onInjectAnomaly();
            }}
            className="w-full rounded py-2 text-xs font-medium tracking-wide bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
          >
            Force Anomaly Spike (#{batch.id})
          </button>
        )}
      </div>
    </div>
  );
}
