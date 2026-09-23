"use client";

import { useEffect, useRef, useState } from "react";
import type { Batch, LLMAnalysisResult } from "@/lib/types";
import { PRODUCTS } from "@/lib/simulation.js";
import SensorGauge from "./SensorGauge";

interface AIAnalysisModalProps {
  isOpen: boolean;
  batch: Batch | null;
  now: number;
  onClose: () => void;
  onMarkResolved?: (batchId: number, diagnosis: LLMAnalysisResult) => void;
  isAlreadyResolved?: boolean;
}

export default function AIAnalysisModal({
  isOpen,
  batch,
  now,
  onClose,
  onMarkResolved,
  isAlreadyResolved = false,
}: AIAnalysisModalProps) {
  const [provider, setProvider] = useState<"gemini" | "huggingface">("gemini");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [llmResult, setLlmResult] = useState<LLMAnalysisResult | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [resolvedState, setResolvedState] = useState(isAlreadyResolved);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setResolvedState(isAlreadyResolved);
  }, [isAlreadyResolved]);

  // Run analysis when modal opens with a batch
  useEffect(() => {
    if (isOpen && batch) {
      handleRunAnalysis("gemini");
    } else {
      setLlmResult(null);
    }
  }, [isOpen, batch?.id]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !batch) return null;

  const cfg = PRODUCTS[batch.product];

  const handleRunAnalysis = async (selectedProvider: "gemini" | "huggingface") => {
    setProvider(selectedProvider);
    setIsAnalyzing(true);
    setElapsedMs(0);
    const start = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 40);

    try {
      const response = await fetch("/api/analyze-anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data: LLMAnalysisResult = await response.json();
      setLlmResult(data);
    } catch (err) {
      console.error("Failed to run AI analysis:", err);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsAnalyzing(false);
    }
  };

  const handleResolveAndLog = () => {
    if (!llmResult) return;
    setResolvedState(true);
    onMarkResolved?.(batch.id, llmResult);
  };

  const handleCopyDirectives = () => {
    if (!llmResult) return;
    const text = `FreshChain AI Diagnostic Report — Batch #${batch.id} (${batch.product.toUpperCase()})
HACCP Risk: ${llmResult.haccpRiskLevel} | Confidence: ${llmResult.confidence}%
Status: ${resolvedState ? "RESOLVED & LOGGED" : "ACTIVE EXCURSION"}
Summary: ${llmResult.summary}
Root Cause: ${llmResult.likelyCause}

Immediate Emergency Directives:
${llmResult.actions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

Preventative Protocols:
${(llmResult.prevention || []).map((p, i) => `• ${p}`).join("\n")}`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl rounded-lg border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up bg-[#121215] text-zinc-100">
        
        {/* ── Top Window Bar / Header ── */}
        <div className="flex items-center justify-between p-4 md:px-5 border-b border-zinc-800 bg-[#18181b] shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-semibold text-zinc-100">
                  AI Anomaly Diagnostics
                </h2>
                <span className="text-[11px] font-mono-data px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Batch #{batch.id} ({cfg.label})
                </span>
                {resolvedState ? (
                  <span className="text-[10px] font-mono-data px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold uppercase flex items-center gap-1">
                    <span>✓</span> Logged &amp; Resolved
                  </span>
                ) : (
                  <span className="text-[10px] font-mono-data px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">
                    {batch.risk.status}
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 font-mono-data mt-0.5 flex items-center gap-2">
                <span>Stage: <strong className="text-zinc-300 font-sans">{batch.stage}</strong></span>
                <span>·</span>
                <span>In Stage: <strong className="text-zinc-300">{Math.max(0, now - batch.stageEnteredAt).toFixed(1)}h</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Provider Switcher */}
            <div className="hidden sm:flex rounded bg-zinc-900 p-0.5 border border-zinc-800 text-xs font-mono-data">
              <button
                type="button"
                onClick={() => handleRunAnalysis("gemini")}
                disabled={isAnalyzing}
                className={`px-2.5 py-1 rounded transition-all ${
                  provider === "gemini"
                    ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => handleRunAnalysis("huggingface")}
                disabled={isAnalyzing}
                className={`px-2.5 py-1 rounded transition-all ${
                  provider === "huggingface"
                    ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Hugging Face
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 transition-colors"
              title="Close window (ESC)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Scrollable Diagnostic Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 space-y-4">
          
          {/* Top Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded p-3 bg-zinc-900/60 border border-zinc-800">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
                HACCP Risk Level
              </div>
              <div className="text-sm font-semibold font-mono-data text-zinc-200">
                {llmResult?.haccpRiskLevel || "Evaluating..."}
              </div>
            </div>

            <div className="rounded p-3 bg-zinc-900/60 border border-zinc-800">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Confidence
              </div>
              <div className="text-base font-semibold font-mono-data text-zinc-100">
                {llmResult ? `${llmResult.confidence}%` : "--"}
              </div>
            </div>

            <div className="rounded p-3 bg-zinc-900/60 border border-zinc-800">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Current Temp
              </div>
              <div className="text-base font-semibold font-mono-data text-zinc-100">
                {batch.temp.toFixed(1)}°C
                <span className="text-[10px] text-zinc-500 font-normal ml-1">
                  (ideal {cfg.idealTemp}°C)
                </span>
              </div>
            </div>

            <div className="rounded p-3 bg-zinc-900/60 border border-zinc-800">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Latency
              </div>
              <div className="text-base font-mono-data text-zinc-300">
                {isAnalyzing ? `${elapsedMs}ms...` : llmResult ? `${llmResult.latencyMs}ms` : "--"}
              </div>
            </div>
          </div>

          {/* ── 2-Column Split Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            
            {/* Left Column: Live IoT Telemetry Snapshot (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded p-3.5 bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-300 border-b border-zinc-800 pb-2">
                  <span>Sensor Telemetry</span>
                  <span className="text-[10px] font-mono-data text-zinc-500">Live</span>
                </div>

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

                {/* Fraud / Anomaly Check */}
                <div className="rounded p-2.5 bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                  <div className="text-[10px] uppercase font-medium text-zinc-400">
                    Tampering & Telemetry Signature
                  </div>
                  <div className="text-xs text-zinc-300">
                    {batch.fraud.fraudSuspected ? (
                      <span className="text-zinc-200 font-medium">
                        ⚠️ {batch.fraud.reason || "Fraud signature detected"}
                      </span>
                    ) : (
                      <span className="text-zinc-400 font-medium">
                        ✓ Nominal sensor correlation
                      </span>
                    )}
                  </div>
                </div>

                {/* Spoilage & Shelf Life */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded p-2 bg-zinc-950/60 border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400 mb-0.5">Spoilage Index</div>
                    <div className="text-sm font-semibold font-mono-data text-zinc-200">
                      {batch.risk.riskScore}%
                    </div>
                  </div>
                  <div className="rounded p-2 bg-zinc-950/60 border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400 mb-0.5">Residual Life</div>
                    <div className="text-sm font-semibold font-mono-data text-zinc-200">
                      {Math.max(0, Math.round(batch.risk.remainingShelfLifeHours))}h
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Generative AI Diagnostics (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="rounded p-4 bg-zinc-900/60 border border-zinc-800 space-y-3">
                {/* AI Model Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                      Analysis Report
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-data text-zinc-400">
                    {llmResult?.model || "Initializing..."}
                  </span>
                </div>

                {isAnalyzing ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-mono-data text-zinc-400">
                      Synthesizing IoT telemetry ({elapsedMs}ms)...
                    </p>
                  </div>
                ) : llmResult ? (
                  <div className="space-y-3 animate-fade-in">
                    {/* Diagnosis Summary */}
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
                        Incident Summary
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                        {llmResult.summary}
                      </p>
                    </div>

                    {/* Root Cause Hypothesis */}
                    <div className="rounded p-2.5 bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
                        Root Cause Hypothesis
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {llmResult.likelyCause}
                      </p>
                    </div>

                    {/* Immediate Emergency Directives */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        Directives ({llmResult.actions.length})
                      </div>
                      <ul className="space-y-1">
                        {llmResult.actions.map((act, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-zinc-300 bg-zinc-950/40 p-2 rounded border border-zinc-800/60"
                          >
                            <span className="font-mono-data text-[10px] font-semibold text-zinc-400 bg-zinc-800 rounded px-1.5 py-0.5 mt-0.5 shrink-0">
                              0{idx + 1}
                            </span>
                            <span className="leading-relaxed">{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Systemic Prevention */}
                    {llmResult.prevention && llmResult.prevention.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                          Prevention Protocols
                        </div>
                        <ul className="space-y-1">
                          {llmResult.prevention.map((prev, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-xs text-zinc-400">
                              <span className="text-zinc-500 shrink-0">•</span>
                              <span>{prev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-zinc-400">
                    No diagnostic data loaded. Click Re-Run below.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Actions Bar ── */}
        <div className="flex items-center justify-between p-3.5 md:px-5 border-t border-zinc-800 bg-[#18181b] shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {!resolvedState && llmResult && (
              <button
                onClick={handleResolveAndLog}
                className="px-3.5 py-1.5 rounded text-xs font-mono-data font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>✓</span>
                <span>Mark as Done &amp; Log Incident</span>
              </button>
            )}

            {resolvedState && (
              <div className="px-3 py-1.5 rounded text-xs font-mono-data text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-1.5">
                <span>✓</span>
                <span>Logged in Incident History</span>
              </div>
            )}

            <button
              onClick={() => handleRunAnalysis(provider)}
              disabled={isAnalyzing}
              className="px-3.5 py-1.5 rounded text-xs font-mono-data font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing..." : "Re-Run Analysis"}
            </button>

            <button
              onClick={handleCopyDirectives}
              disabled={!llmResult}
              className="px-3 py-1.5 rounded text-xs font-mono-data text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50"
            >
              {copySuccess ? "✓ Copied" : "Copy Report"}
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs font-mono-data font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
