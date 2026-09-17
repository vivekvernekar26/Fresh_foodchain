"use client";

import { useEffect, useRef, useState } from "react";
import * as engine from "@/lib/simulation.js";
import type { Batch, AlertEvent } from "@/lib/types";

// ── Engine casts (lib/simulation.js is deliberately plain-JS) ────────────
const createBatch  = engine.createBatch  as unknown as (now: number) => Batch;
const stepFleet    = engine.stepFleet    as unknown as (
  batches: Batch[],
  now: number,
  dtHours: number,
  tracking: { statusById: Map<number, string>; fraudFlagged: Set<number> }
) => { batches: Batch[]; events: AlertEvent[]; delivered: number; spoiled: number };
const PRODUCTS     = engine.PRODUCTS as Record<
  string,
  { label: string; emoji: string; idealTemp: number; idealHumidity: number; idealGas: number; baselineShelfLifeHours: number }
>;
const computeRisk  = engine.computeRisk  as unknown as (batch: Batch) => Batch["risk"];
const detectFraud  = engine.detectFraud  as unknown as (batch: Batch) => Batch["fraud"];
const forceAnomaly = engine.forceAnomaly as unknown as (batch: Batch) => void;

import RouteMap    from "@/components/RouteMap";
import AnomalyPanel from "@/components/AnomalyPanel";
import AlertsFeed  from "@/components/AlertsFeed";
import Controls    from "@/components/Controls";

// ── Simulation constants ──────────────────────────────────────────────────
const TICK_MS        = 1000;
const HOURS_PER_TICK = 0.5;
/** Scripted anomaly fires at this simulated time (hours). At 1× speed = 10 ticks = 10 s. */
const ANOMALY_AT     = 5;

/** Build a pinned batch: overrides product, stage, and sensor readings. */
function makeBatch(
  product: "milk" | "meat" | "fruit",
  stage: Batch["stage"],
  dwellTarget: number,
): Batch {
  const b = createBatch(0);
  const cfg = PRODUCTS[product];
  b.product        = product;
  b.stage          = stage;
  b.stageEnteredAt = 0;
  b.dwellTarget    = dwellTarget;
  b.temp           = cfg.idealTemp;
  b.humidity       = cfg.idealHumidity;
  b.gas            = cfg.idealGas;
  (b as unknown as Record<string,unknown>).spoilagePoints = 0;
  b.history        = [{ t: 0, temp: b.temp, humidity: b.humidity, gas: b.gas }];
  b.risk           = computeRisk(b);
  b.fraud          = detectFraud(b);
  return b;
}

// ── Stats bar (inline — simpler than a separate component) ────────────────
function StatsBar({
  batches,
  delivered,
  anomalyFired,
  now,
}: {
  batches: Batch[];
  delivered: number;
  anomalyFired: boolean;
  now: number;
}) {
  const atRisk = batches.filter(b => b.risk.status !== "ok").length;
  const stats = [
    { icon: "🚚", label: "Batches in route",    value: batches.length,             tone: "text-slate-200" },
    { icon: "⚠️", label: "At risk now",          value: atRisk,                     tone: atRisk > 0 ? "text-amber-400" : "text-slate-400" },
    { icon: "🚨", label: "Anomalies detected",   value: anomalyFired ? 1 : 0,       tone: anomalyFired ? "text-red-400" : "text-slate-500" },
    { icon: "✅", label: "Delivered fresh",       value: delivered,                  tone: "text-emerald-400" },
    { icon: "⏱",  label: "Sim time",             value: `${now.toFixed(1)}h`,       tone: "text-sky-400" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {stats.map(s => (
        <div
          key={s.label}
          className="rounded-xl p-3 transition-all duration-300"
          style={{ background: "rgba(11,22,34,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base leading-none">{s.icon}</span>
            <span className={`text-xl font-bold tabular-nums ${s.tone}`}>{s.value}</span>
          </div>
          <div className="text-[10px] text-slate-600 leading-tight">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Home() {
  const [batches,    setBatches]    = useState<Batch[]>([]);
  const [alerts,     setAlerts]     = useState<AlertEvent[]>([]);
  const [running,    setRunning]    = useState(true);
  const [speed,      setSpeed]      = useState(1);
  const [now,        setNow]        = useState(0);
  const [delivered,  setDelivered]  = useState(0);

  // Anomaly state
  const [anomalyFired,   setAnomalyFired]   = useState(false);
  const [anomalyBatchId, setAnomalyBatchId] = useState<number | null>(null);
  const [showAIPanel,    setShowAIPanel]    = useState(false);

  const nowRef           = useRef(0);
  const anomalyFiredRef  = useRef(false);   // ref-mirror for inside setState callback
  const trackingRef      = useRef({
    statusById:   new Map<number, string>(),
    fraudFlagged: new Set<number>(),
  });

  // ── Initialise 3 pinned batches (client-side only to avoid hydration mismatch) ──
  useEffect(() => {
    const milk  = makeBatch("milk",  "Farm",    12); // stays in Farm ~12h
    const fruit = makeBatch("fruit", "Storage", 14); // stays in Storage ~14h
    const meat  = makeBatch("meat",  "Truck",   22); // stays in Truck well past anomaly (t=5h)
    setBatches([milk, fruit, meat]);
  }, []);

  // ── Tick loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || batches.length === 0) return;
    const id = setInterval(() => {
      nowRef.current += HOURS_PER_TICK * speed;
      setNow(nowRef.current);

      setBatches(prev => {
        // ── Scripted anomaly trigger — fires exactly once at ANOMALY_AT ──
        if (nowRef.current >= ANOMALY_AT && !anomalyFiredRef.current) {
          const meatBatch = prev.find(b => b.product === "meat" && b.stage === "Truck");
          if (meatBatch) {
            anomalyFiredRef.current = true;
            forceAnomaly(meatBatch); // plants forcedSpikeNextTick flag

            setAnomalyFired(true);
            setAnomalyBatchId(meatBatch.id);

            // Exactly 3 hardcoded alerts for this one incident — no general noise
            const t = nowRef.current;
            const id = meatBatch.id;
            setAlerts([
              {
                id: `alert-breach-${id}`,
                time: t,
                text: `🚨 Cold Chain Breach — 🥩 Meat Batch #${id}: temperature jumped from 2.1°C to 18.3°C during Truck transit.`,
                severity: "critical" as const,
              },
              {
                id: `alert-risk-${id}`,
                time: t - 0.5,
                text: `⚠️ Risk Escalated to CRITICAL — 🥩 Meat Batch #${id}: spoilage risk at 82%. Refrigeration fault suspected.`,
                severity: "critical" as const,
              },
              {
                id: `alert-action-${id}`,
                time: t - 1.0,
                text: `📋 Action Required — 🥩 Meat Batch #${id}: quarantine recommended. Click ⚠️ to open AI Analyser for full diagnosis.`,
                severity: "warning" as const,
              },
            ]);
          }
        }

        const result = stepFleet(prev, nowRef.current, HOURS_PER_TICK * speed, trackingRef.current);
        // Suppress general simulation events — only the 3 scripted anomaly alerts are shown
        if (result.delivered) {
          setDelivered(d => d + result.delivered);
        }
        return result.batches;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, speed, batches.length]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(ellipse at 15% 10%, rgba(132,204,22,0.04) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 90%, rgba(56,189,248,0.04) 0%, transparent 50%),
          var(--bg-base)
        `,
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-screen-xl flex-col gap-4 p-4 lg:p-5">

        {/* ── Header ── */}
        <header
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4"
          style={{
            background: "rgba(11,22,34,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
              🌾 FreshChain
              <span className="ml-2 text-sm font-medium text-slate-500">AI Supply Chain Integrity</span>
            </h1>
            <p className="text-xs text-slate-700 mt-0.5">
              3 live batches · Farm → Storage → Truck → Warehouse → Shop → Customer
            </p>
          </div>
          <Controls
            running={running}
            setRunning={setRunning}
            speed={speed}
            setSpeed={setSpeed}
            onInjectAnomaly={() => {
              // Manual anomaly injection (same as scripted but user-triggered)
              const truckBatch = batches.find(b => b.stage === "Truck");
              const target = truckBatch ?? batches[0];
              if (target) {
                forceAnomaly(target);
                if (!anomalyFiredRef.current) {
                  anomalyFiredRef.current = true;
                  setAnomalyFired(true);
                  setAnomalyBatchId(target.id);
                }
              }
            }}
          />
        </header>

        {/* ── Anomaly banner ── */}
        {anomalyFired && !showAIPanel && (
          <button
            id="anomaly-banner"
            onClick={() => setShowAIPanel(true)}
            className="w-full rounded-xl px-5 py-3 flex items-center gap-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.005] animate-slide-up"
            style={{
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.45)",
              color: "#fca5a5",
              boxShadow: "0 0 32px rgba(239,68,68,0.12)",
              animation: "pulseGlow 2.5s ease infinite",
            }}
          >
            <span className="text-lg">⚠️</span>
            <span>
              <strong>COLD CHAIN BREACH DETECTED</strong> — 🥩 Meat Batch #{anomalyBatchId} ·
              Temperature spiked to 18.3°C during Truck transit
            </span>
            <span
              className="ml-auto rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)" }}
            >
              Click to Analyse →
            </span>
          </button>
        )}

        {/* ── Main content grid ── */}
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-4">
          {/* Route Map (dominant) */}
          <div className="lg:col-span-3 flex flex-col">
            <RouteMap
              batches={batches}
              anomalyFired={anomalyFired}
              anomalyBatchId={anomalyBatchId}
              onAnomalyClick={() => setShowAIPanel(true)}
            />
          </div>
          {/* Alerts sidebar */}
          <div className="lg:col-span-1 min-h-64 lg:min-h-0">
            <AlertsFeed alerts={alerts} />
          </div>
        </div>

        {/* ── Stats footer ── */}
        <StatsBar batches={batches} delivered={delivered} anomalyFired={anomalyFired} now={now} />

        {/* ── Footer hint ── */}
        <p className="text-center text-[10px] text-slate-800 pb-1">
          {anomalyFired
            ? "⚠ Anomaly detected — click the banner or ⚠️ on the map to open the AI Analyser"
            : `Anomaly will trigger at T+${ANOMALY_AT}h · (currently T+${now.toFixed(1)}h at ${speed}× speed)`}
        </p>
      </div>

      {/* ── AI Analyser overlay ── */}
      {showAIPanel && anomalyBatchId !== null && (
        <AnomalyPanel batchId={anomalyBatchId} onClose={() => setShowAIPanel(false)} />
      )}
    </div>
  );
}
