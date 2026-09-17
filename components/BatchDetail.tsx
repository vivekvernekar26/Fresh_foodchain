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

const STATUS_COLOR: Record<string, string> = {
  ok:       "var(--color-ok)",
  warning:  "var(--color-warn)",
  critical: "var(--color-crit)",
};

/* ── Upgraded Sparkline: area fill + gradient + ideal reference line ───── */
function Sparkline({
  values,
  color,
  ideal,
  label,
  unit,
}: {
  values: number[];
  color: string;
  ideal: number;
  label: string;
  unit: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values, ideal) * 0.95;
  const max = Math.max(...values, ideal) * 1.05 || 1;
  const range = max - min || 1;
  const W = 100, H = 40;
  const toX = (i: number) => (i / (values.length - 1)) * W;
  const toY = (v: number) => H - ((v - min) / range) * (H - 4) - 2;

  const linePoints = values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const areaPoints =
    `0,${H} ` +
    values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ") +
    ` ${W},${H}`;

  const idealY = toY(ideal);
  const gradId = `grad-${label.replace(/\s/g, "")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-medium" style={{ color }}>
          {values[values.length - 1].toFixed(1)}{unit}
          <span className="text-slate-600 ml-1">(ideal {ideal}{unit})</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 44 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <polygon points={areaPoints} fill={`url(#${gradId})`} />
        {/* Ideal reference line */}
        <line
          x1="0" y1={idealY} x2={W} y2={idealY}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
        {/* Main line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 3px ${color}88)` }}
        />
        {/* Latest value dot */}
        <circle
          cx={toX(values.length - 1)}
          cy={toY(values[values.length - 1])}
          r="2.5"
          fill={color}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
    </div>
  );
}

/* ── AI Analyser Panel ───────────────────────────────────────────────────── */
function AIAnalyser({ analysis }: { analysis: AnomalyAnalysis }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3 mt-4"
      style={{
        background: "rgba(56,189,248,0.05)",
        border: "1px solid rgba(56,189,248,0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-sky-300 tracking-wide uppercase">🤖 AI Analyser</span>
        {/* Confidence meter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Confidence</span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${analysis.confidence}%`,
                background: analysis.confidence > 80
                  ? "linear-gradient(90deg,#10b981,#34d399)"
                  : analysis.confidence > 60
                  ? "linear-gradient(90deg,#f59e0b,#fcd34d)"
                  : "linear-gradient(90deg,#ef4444,#f87171)",
              }}
            />
          </div>
          <span
            className="text-xs font-bold"
            style={{
              color: analysis.confidence > 80 ? "var(--color-ok)"
                   : analysis.confidence > 60 ? "var(--color-warn)"
                   : "var(--color-crit)",
            }}
          >
            {analysis.confidence}%
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-300 leading-relaxed">{analysis.summary}</p>

      {/* Likely cause */}
      <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Likely Cause</div>
        <p className="text-xs text-slate-400 leading-relaxed">{analysis.likelyCause}</p>
      </div>

      {/* Actions */}
      <div>
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Recommended Actions</div>
        <ol className="space-y-1">
          {analysis.actions.map((action, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-300">
              <span
                className="shrink-0 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}
              >
                {i + 1}
              </span>
              {action}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function BatchDetail({
  batch,
  now,
  onClose,
}: {
  batch: Batch;
  now: number;
  onClose: () => void;
}) {
  const cfg = PRODUCTS[batch.product];
  const destination = recommendDestinationFn(batch, SHOPS, now);
  const analysis = analyzeAnomalyFn(batch);
  const statusColor = STATUS_COLOR[batch.risk.status];
  const shelfLeft = Math.max(0, Math.round(batch.risk.remainingShelfLifeHours));

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center p-4"
      style={{ background: "rgba(5,12,20,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: "rgba(11,22,34,0.95)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {cfg.emoji} {cfg.label}
                <span className="ml-2 text-slate-600 font-normal text-sm">Batch #{batch.id}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Currently at <span className="text-slate-300">{batch.stage}</span>
              </p>
            </div>
            <button
              id="batch-detail-close"
              onClick={onClose}
              className="rounded-full w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              ✕
            </button>
          </div>

          {/* Risk summary row */}
          <div className="flex items-center gap-4 mt-4">
            <div>
              <div className="text-3xl font-extrabold tabular-nums" style={{ color: statusColor }}>
                {batch.risk.riskScore}%
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Spoilage risk</div>
            </div>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${batch.risk.riskScore}%`,
                  background: `linear-gradient(90deg, ${statusColor}aa, ${statusColor})`,
                  boxShadow: `0 0 8px ${statusColor}66`,
                }}
              />
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-200">{shelfLeft}h</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Shelf left</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* ── Fraud alert ── */}
          {batch.fraud.fraudSuspected && (
            <div
              className="rounded-xl p-3 text-sm"
              style={{
                background: "rgba(69,10,10,0.5)",
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#fca5a5",
              }}
            >
              🚩 <strong>Fraud / Anomaly Detected</strong>
              <p className="mt-1 text-xs text-red-300/80">{batch.fraud.reason}</p>
            </div>
          )}

          {/* ── Sensor gauges ── */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Live Sensors
            </div>
            <div className="flex items-center justify-around">
              <SensorGauge
                value={batch.temp}
                min={-5}
                max={35}
                ideal={cfg.idealTemp}
                color="#f87171"
                label="Temperature"
                unit="°C"
              />
              <SensorGauge
                value={batch.humidity}
                min={30}
                max={100}
                ideal={cfg.idealHumidity}
                color="#60a5fa"
                label="Humidity"
                unit="%"
              />
              <SensorGauge
                value={batch.gas}
                min={0}
                max={cfg.idealGas * 4}
                ideal={cfg.idealGas}
                color="#4ade80"
                label="Gas"
                unit="ppm"
              />
            </div>
          </div>

          {/* ── Sparklines ── */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Sensor History
            </div>
            <div className="space-y-4">
              <Sparkline
                values={batch.history.map((h) => h.temp)}
                color="#f87171"
                ideal={cfg.idealTemp}
                label="Temperature"
                unit="°C"
              />
              <Sparkline
                values={batch.history.map((h) => h.humidity)}
                color="#60a5fa"
                ideal={cfg.idealHumidity}
                label="Humidity"
                unit="%"
              />
              <Sparkline
                values={batch.history.map((h) => h.gas)}
                color="#4ade80"
                ideal={cfg.idealGas}
                label="Gas level"
                unit="ppm"
              />
            </div>
          </div>

          {/* ── AI Analyser ── */}
          <AIAnalyser analysis={analysis} />

          {/* ── Destination recommendation ── */}
          <div
            className="rounded-xl p-3"
            style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.18)" }}
          >
            <div className="text-[10px] font-semibold text-sky-500 uppercase tracking-wide mb-2">
              📍 Recommended Destination
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-sky-300">{destination.name}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {[
                { label: "Demand", value: destination.demand, color: "#4ade80" },
                { label: "Stock", value: destination.stock, color: "#f87171" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>{label}</span>
                    <span style={{ color }}>{value}/5</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(value / 5) * 100}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
