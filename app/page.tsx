"use client";

import { useEffect, useRef, useState } from "react";
import * as engine from "@/lib/simulation.js";
import type { Batch, AlertEvent } from "@/lib/types";

// ── Engine casts (lib/simulation.js is plain JS) ─────────────────────────
const createBatch = engine.createBatch as unknown as (now: number) => Batch;
const stepFleet = engine.stepFleet as unknown as (
  batches: Batch[],
  now: number,
  dtHours: number,
  tracking: { statusById: Map<number, string>; fraudFlagged: Set<number> }
) => { batches: Batch[]; events: AlertEvent[]; delivered: number; spoiled: number };
const forceAnomaly = engine.forceAnomaly as unknown as (batch: Batch) => void;
const computeRisk = engine.computeRisk as unknown as (batch: Batch) => Batch["risk"];
const detectFraud = engine.detectFraud as unknown as (batch: Batch) => Batch["fraud"];
const PRODUCTS_MAP = engine.PRODUCTS as Record<
  string,
  { label: string; emoji: string; idealTemp: number; idealHumidity: number; idealGas: number; baselineShelfLifeHours: number }
>;

import RouteMap from "@/components/RouteMap";
import AlertsFeed from "@/components/AlertsFeed";
import Controls from "@/components/Controls";
import PipelineBoard from "@/components/PipelineBoard";
import BatchDetail from "@/components/BatchDetail";
import BatchPicker from "@/components/BatchPicker";
import NewBatchModal from "@/components/NewBatchModal";
import StatsBar from "@/components/StatsBar";
import AIAnalysisModal from "@/components/AIAnalysisModal";

// ── Simulation constants ──────────────────────────────────────────────────
const TICK_MS = 1000;
const HOURS_PER_TICK = 0.5;

export default function Home() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [now, setNow] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [spoiled, setSpoiled] = useState(0);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"alerts" | "detail">("alerts");
  const [aiModalBatch, setAiModalBatch] = useState<Batch | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [resolvedBatchIds, setResolvedBatchIds] = useState<Set<number>>(new Set());

  const nowRef = useRef(0);
  const trackingRef = useRef({
    statusById: new Map<number, string>(),
    fraudFlagged: new Set<number>(),
  });

  // ── Init fleet on client only (default: exactly 3 batches distributed cleanly) ─────
  useEffect(() => {
    const defaults: Array<{ product: "milk" | "meat" | "fruit"; stage: Batch["stage"] }> = [
      { product: "milk",  stage: "Farm" },
      { product: "meat",  stage: "Truck" },
      { product: "fruit", stage: "Storage" },
    ];
    const fleet: Batch[] = defaults.map((d) => {
      const cfg = PRODUCTS_MAP[d.product];
      const b = createBatch(0);
      b.product = d.product;
      b.stage = d.stage;
      b.temp = cfg.idealTemp + (Math.random() - 0.5);
      b.humidity = cfg.idealHumidity + (Math.random() * 4 - 2);
      b.gas = cfg.idealGas + (Math.random() * 2 - 1);
      b.history = [{ t: 0, temp: b.temp, humidity: b.humidity, gas: b.gas }];
      b.risk = computeRisk(b);
      b.fraud = detectFraud(b);
      return b;
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBatches(fleet);
  }, []);

  // ── Tick loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || batches.length === 0) return;
    const id = setInterval(() => {
      nowRef.current += HOURS_PER_TICK * speed;
      setNow(nowRef.current);

      setBatches((prev) => {
        const result = stepFleet(prev, nowRef.current, HOURS_PER_TICK * speed, trackingRef.current);

        if (result.events.length > 0) {
          setAlerts((existing) => [...result.events, ...existing].slice(0, 50));
        }

        if (result.delivered) setDelivered((d) => d + result.delivered);
        if (result.spoiled) setSpoiled((s) => s + result.spoiled);

        return result.batches;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, speed, batches.length]);

  // Derived values
  const inTransitCount = batches.filter((b) => b.stage === "Truck").length;
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;
  const criticalBatches = batches.filter(
    (b) => b.risk.status === "critical" && !resolvedBatchIds.has(b.id)
  );

  // Handlers
  function handleMarkAnomalyResolved(batchId: number, diagnosis: import("@/lib/types").LLMAnalysisResult) {
    setResolvedBatchIds((prev) => {
      const next = new Set(prev);
      next.add(batchId);
      return next;
    });

    setAlerts((prev) =>
      prev.map((a) => {
        const match = a.text.match(/#(\d+)/);
        const targetId = a.batchId ?? (match ? parseInt(match[1], 10) : null);
        if (targetId === batchId) {
          return {
            ...a,
            resolved: true,
            resolvedAt: nowRef.current,
            diagnosis,
          };
        }
        return a;
      })
    );
  }

  function handleBatchClick(id: number) {
    if (selectedBatchId === id) {
      setSelectedBatchId(null);
      setActiveRightTab("alerts");
    } else {
      setSelectedBatchId(id);
      setActiveRightTab("detail");
    }
  }

  function handleInjectAnomaly(batch: Batch) {
    forceAnomaly(batch);
    const cfg = PRODUCTS_MAP[batch.product];
    const injectAlert: AlertEvent = {
      id: `inject-${batch.id}-${Date.now()}`,
      time: nowRef.current,
      text: `⚡ Forced refrigeration breakdown on ${cfg.emoji} ${cfg.label} Batch #${batch.id}. Thermal readings will spike next tick.`,
      severity: "warning",
    };
    setAlerts((prev) => [injectAlert, ...prev].slice(0, 50));
  }

  function handleCreateCustomBatch(
    product: "milk" | "meat" | "fruit" | "vegetable",
    stage: Batch["stage"]
  ) {
    const cfg = PRODUCTS_MAP[product];
    const newBatch = createBatch(nowRef.current);
    newBatch.product = product;
    newBatch.stage = stage;
    newBatch.temp = cfg.idealTemp + (Math.random() - 0.5);
    newBatch.humidity = cfg.idealHumidity + (Math.random() * 4 - 2);
    newBatch.gas = cfg.idealGas + (Math.random() * 2 - 1);
    newBatch.history = [
      { t: nowRef.current, temp: newBatch.temp, humidity: newBatch.humidity, gas: newBatch.gas },
    ];
    newBatch.risk = computeRisk(newBatch);
    newBatch.fraud = detectFraud(newBatch);

    setBatches((prev) => [...prev, newBatch]);
    setSelectedBatchId(newBatch.id);
    setActiveRightTab("detail");

    const addAlert: AlertEvent = {
      id: `add-${newBatch.id}-${Date.now()}`,
      time: nowRef.current,
      text: `✅ New cargo dispatched: ${cfg.emoji} ${cfg.label} Batch #${newBatch.id} entered ${stage} stage.`,
      severity: "ok",
    };
    setAlerts((prev) => [addAlert, ...prev].slice(0, 50));
  }

  return (
    <div
      className="min-h-screen relative"
      style={{
        background: `
          radial-gradient(ellipse at 10% 5%, rgba(16, 185, 129, 0.06) 0%, transparent 45%),
          radial-gradient(ellipse at 90% 15%, rgba(6, 182, 212, 0.06) 0%, transparent 45%),
          radial-gradient(ellipse at 50% 95%, rgba(139, 92, 246, 0.04) 0%, transparent 55%),
          #06090e
        `,
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 p-3.5 sm:p-5 lg:gap-5">
        {/* ── Top Header Bar ── */}
        <header className="rounded-xl bg-[#0f1420] p-4 flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-xl">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xl">🌿</span>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  FreshChain<span className="text-emerald-400">OS</span>
                </h1>
                <span className="hidden sm:inline text-[10px] font-mono-data font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  AI COLD-CHAIN v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-data">
                Sim Time: <span className="text-slate-200 font-semibold">T+{now.toFixed(1)}h</span> · <span className="text-slate-200 font-semibold">{inTransitCount}</span> in Transit · <span className="text-slate-200 font-semibold">{batches.length}</span> Total Fleet
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <Controls
            running={running}
            setRunning={setRunning}
            speed={speed}
            setSpeed={setSpeed}
            batchCount={batches.length}
            onInjectAnomaly={() => setShowPicker(true)}
            onAddBatch={() => setShowNewBatchModal(true)}
          />
        </header>

        {/* ── Executive Metric Pods ── */}
        <StatsBar batches={batches} delivered={delivered} spoiled={spoiled} />

        {/* ── Emergency Anomaly Banner (Shown if critical batches exist) ── */}
        {criticalBatches.length > 0 && (
          <div
            id="anomaly-banner"
            onClick={() => handleBatchClick(criticalBatches[0].id)}
            className="group cursor-pointer rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold transition-all hover:border-red-500/50 bg-red-950/30 border border-red-500/30 text-red-200 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🚨</span>
              <div>
                <span className="font-bold uppercase tracking-wide text-red-300">
                  CRITICAL COLD-CHAIN BREACH DETECTED:
                </span>{" "}
                <span className="text-slate-200">
                  {criticalBatches
                    .map((b) => {
                      const cfg = PRODUCTS_MAP[b.product];
                      return `${cfg.emoji} ${cfg.label} #${b.id} (${b.stage})`;
                    })
                    .join(" · ")}
                </span>
              </div>
            </div>

            <span className="font-mono-data font-semibold px-3 py-1 rounded-lg bg-red-500/20 text-red-200 border border-red-500/30 group-hover:bg-red-500/30 transition-colors">
              Lock On &amp; Diagnose →
            </span>
          </div>
        )}

        {/* ── Main Command Grid (2 Zones: Operations Deck & Intelligence Rail) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 flex-1 min-h-0">
          {/* ── Zone 1: Main Operations Deck (Left / ~8 cols on desktop) ── */}
          <main className="lg:col-span-8 flex flex-col gap-4 lg:gap-5">
            {/* Live Logistics Route Corridor */}
            <RouteMap
              batches={batches}
              selectedBatchId={selectedBatchId}
              onBatchClick={handleBatchClick}
            />

            {/* 6-Stage Supply Chain Flight Board */}
            <PipelineBoard
              batches={batches}
              selectedBatchId={selectedBatchId}
              onSelect={handleBatchClick}
            />
          </main>

          {/* ── Zone 2: Mission Telemetry & Intelligence Rail (Right / ~4 cols) ── */}
          <aside className="lg:col-span-4 flex flex-col gap-3 min-h-[500px]">
            {/* Rail Switcher Header */}
            <div className="flex items-center justify-between p-1 rounded-lg bg-[#0c1017] border border-slate-800">
              <button
                onClick={() => setActiveRightTab("alerts")}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-mono-data font-medium transition-all ${
                  activeRightTab === "alerts"
                    ? "bg-slate-800 text-slate-100 border border-slate-700 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Incident Stream ({alerts.length})
              </button>

              <button
                onClick={() => {
                  if (!selectedBatch && batches.length > 0) {
                    setSelectedBatchId(batches[0].id);
                  }
                  setActiveRightTab("detail");
                }}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-mono-data font-medium transition-all ${
                  activeRightTab === "detail"
                    ? "bg-slate-800 text-slate-100 border border-slate-700 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {selectedBatch ? `Batch #${selectedBatch.id} HUD` : "Inspector HUD"}
              </button>
            </div>

            {/* Rail Content View */}
            <div className="flex-1">
              {activeRightTab === "detail" && selectedBatch ? (
                <BatchDetail
                  batch={selectedBatch}
                  now={now}
                  isResolved={Boolean(selectedBatch && resolvedBatchIds.has(selectedBatch.id))}
                  onClose={() => {
                    setSelectedBatchId(null);
                    setActiveRightTab("alerts");
                  }}
                  onInjectAnomaly={() => handleInjectAnomaly(selectedBatch)}
                  onOpenAIModal={(b) => {
                    setAiModalBatch(b);
                    setIsAiModalOpen(true);
                  }}
                />
              ) : activeRightTab === "detail" && !selectedBatch ? (
                <div className="rounded-lg p-6 text-center flex flex-col items-center justify-center h-full min-h-[320px] bg-zinc-900/50 border border-zinc-800">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-lg mb-2 text-zinc-300">
                    🔍
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                    No Cargo Pod Selected
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-xs mb-3 leading-relaxed">
                    Select any batch from the pipeline board or incident stream to view live telemetry and AI root-cause diagnostics.
                  </p>
                  {batches.length > 0 && (
                    <button
                      onClick={() => setSelectedBatchId(batches[0].id)}
                      className="px-3 py-1.5 rounded text-xs font-mono-data font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                    >
                      Inspect Batch #{batches[0].id}
                    </button>
                  )}
                </div>
              ) : (
                <AlertsFeed
                  alerts={alerts}
                  batchCount={batches.length}
                  onSelectBatch={(id) => {
                    setSelectedBatchId(id);
                    setActiveRightTab("detail");
                  }}
                  onTriggerAIAnalysis={(id) => {
                    const target = batches.find((b) => b.id === id) || null;
                    if (target) {
                      setAiModalBatch(target);
                      setIsAiModalOpen(true);
                    } else {
                      setSelectedBatchId(id);
                      setActiveRightTab("detail");
                    }
                  }}
                />
              )}
            </div>
          </aside>
        </div>

        {/* ── Footer Mission Status ── */}
        <footer className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#121215] border border-zinc-800 text-[11px] font-mono-data text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>AI Supply Chain Integrity Engine Operational</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Clock: T+{now.toFixed(1)}h</span>
            <span>Speed: {speed}×</span>
            <span>In Road Transit: <strong className="text-zinc-300 font-semibold">{inTransitCount}</strong></span>
            <span>Total Fleet: <strong className="text-zinc-300 font-semibold">{batches.length}</strong></span>
          </div>
        </footer>
      </div>

      {/* ── Dedicated AI Analysis Diagnostic Window Modal ── */}
      <AIAnalysisModal
        isOpen={isAiModalOpen}
        batch={aiModalBatch}
        now={now}
        isAlreadyResolved={Boolean(aiModalBatch && resolvedBatchIds.has(aiModalBatch.id))}
        onMarkResolved={handleMarkAnomalyResolved}
        onClose={() => setIsAiModalOpen(false)}
      />

      {/* ── Batch Picker Incident Injection Modal ── */}
      {showPicker && (
        <BatchPicker
          batches={batches}
          onSelect={handleInjectAnomaly}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* ── New Batch Dispatch Modal ── */}
      {showNewBatchModal && (
        <NewBatchModal
          onAdd={handleCreateCustomBatch}
          onClose={() => setShowNewBatchModal(false)}
        />
      )}
    </div>
  );
}
