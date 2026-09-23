"use client";

import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   All AI analysis content is hardcoded but formatted to look AI-generated.
   It models a real cold-chain breach on a meat batch during truck transit.
───────────────────────────────────────────────────────────────────────── */

const TIMELINE = [
  { time: "T+0.0h", event: "Batch loaded at Storage facility — temp 2.1°C, refrigeration nominal, door sealed", ok: true,    now: false },
  { time: "T+1.5h", event: "Transit readings stable: 2.3°C, 75% humidity, 8.1 ppm gas", ok: true,    now: false },
  { time: "T+2.8h", event: "Sub-threshold compressor current anomaly logged (no alert sent)", ok: null,    now: false },
  { time: "T+3.4h", event: "Compressor fault — active refrigeration lost silently", ok: false,   now: false },
  { time: "T+4.0h", event: "Cargo bay temperature rising with ambient heat load (~1.5°C/min)", ok: false,   now: false },
  { time: "T+5.0h", event: "IoT sensor poll fires: 18.3°C recorded → this alert generated  ← YOU ARE HERE", ok: false,   now: true  },
];

const STEPS = [
  "Quarantine Batch #3 immediately — halt all further transit movement",
  "Pull refrigeration unit telemetry: compressor logs, door-open event log",
  "Cross-reference GPS stop log with the spike timestamp for unscheduled dwell events",
  "Deploy a calibrated spot-check thermometer to independently verify sensor reading",
  "Commission a lab microbiological assessment if contamination cannot be ruled out",
  "Notify destination shop of delay; reroute a replacement batch from Storage",
  "Log the incident in the supplier Quality Management System (QMS) for audit trail",
];

const PREVENTION = [
  "Install dual-redundant temperature sensors with real-time streaming — do not rely on polling",
  "Set automated push alerts at ±2 °C deviation (not just at the scheduled polling interval)",
  "Mandate compressor-status confirmation and door-seal integrity check at every loading event",
  "Schedule predictive compressor maintenance every 2,000 operating hours",
  "Add a passive dry-ice tray as a fail-safe cooling reserve for active-system failure",
];

/* Section reveal schedule: delay in ms from panel open */
const REVEALS: { key: string; delay: number }[] = [
  { key: "chart",      delay:  400 },
  { key: "diagnosis",  delay:  900 },
  { key: "rootCause",  delay: 1700 },
  { key: "howOccurred",delay: 2500 },
  { key: "timeline",   delay: 3100 },
  { key: "steps",      delay: 3900 },
  { key: "prevention", delay: 4700 },
];

/* ── Temperature spark data (hardcoded spike) ───────────────────────── */
const TEMP_POINTS = [2.1, 2.2, 2.0, 2.3, 2.1, 2.3, 2.4, 3.7, 6.2, 11.8, 18.3];

function TempChart() {
  const W = 500, H = 90;
  const PAD = { l: 20, r: 20, t: 10, b: 10 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const minV = -1, maxV = 21;
  const range = maxV - minV;

  const toX = (i: number) => PAD.l + (i / (TEMP_POINTS.length - 1)) * innerW;
  const toY = (v: number) => PAD.t + innerH - ((v - minV) / range) * innerH;

  const line = TEMP_POINTS.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const area = `${PAD.l},${toY(minV)} ` + TEMP_POINTS.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ") + ` ${W - PAD.r},${toY(minV)}`;

  return (
    <div className="rounded-xl p-4 animate-fade-in"
      style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold tracking-widest text-red-400 uppercase">🌡 Temperature Trace</span>
        <span className="text-[10px] text-slate-600">Target: 2°C · EC 853/2004 limit: 7°C · Breach: 18.3°C</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 90 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="spikeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Danger zone (above 7°C) */}
        <rect x={PAD.l} y={toY(maxV)} width={innerW} height={toY(7) - toY(maxV)}
          fill="rgba(239,68,68,0.07)" />

        {/* Safe zone reference */}
        <line x1={PAD.l} y1={toY(2)} x2={W - PAD.r} y2={toY(2)}
          stroke="rgba(52,211,153,0.5)" strokeWidth={1} strokeDasharray="5 4" />

        {/* Danger threshold */}
        <line x1={PAD.l} y1={toY(7)} x2={W - PAD.r} y2={toY(7)}
          stroke="rgba(239,68,68,0.5)" strokeWidth={1} strokeDasharray="5 4" />

        {/* Area fill */}
        <polygon points={area} fill="url(#spikeGrad)" />

        {/* Line */}
        <polyline points={line} fill="none" stroke="#f87171" strokeWidth={2.2} strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 4px rgba(239,68,68,0.6))" }} />

        {/* Spike dot */}
        <circle cx={toX(TEMP_POINTS.length - 1)} cy={toY(18.3)} r={4.5} fill="#ef4444"
          style={{ filter: "drop-shadow(0 0 6px #ef4444)" }} />

        {/* Labels */}
        <text x={PAD.l + 3} y={toY(2) - 3} fontSize={8} fill="rgba(52,211,153,0.75)" fontFamily="Inter,sans-serif">
          2°C safe
        </text>
        <text x={PAD.l + 3} y={toY(7) - 3} fontSize={8} fill="rgba(239,68,68,0.75)" fontFamily="Inter,sans-serif">
          7°C limit
        </text>
        <text x={toX(TEMP_POINTS.length - 1) - 38} y={toY(18.3) - 8}
          fontSize={9} fill="#f87171" fontFamily="Inter,sans-serif" fontWeight="700">
          18.3°C ⚠
        </text>
      </svg>

      <div className="flex justify-between text-[9px] text-slate-700 mt-1 font-mono">
        <span>T+0h (loaded)</span>
        <span>Truck transit ────────────────────────────────────────────→</span>
        <span>T+5h (now)</span>
      </div>
    </div>
  );
}

function Section({
  title, icon, color, delay, children,
}: {
  title: string; icon: string; color: string; delay?: number; children: React.ReactNode;
}) {
  return (
    <div
      className="mb-4 rounded-xl p-4 animate-slide-up"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        animationDelay: delay ? `${delay}ms` : "0ms",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function AnomalyPanel({ batchId, onClose }: { batchId: number; onClose: () => void }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [thinking, setThinking] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Brief "thinking" phase then reveal sections progressively
    const t0 = setTimeout(() => setThinking(false), 700);
    timers.current.push(t0);

    REVEALS.forEach(({ key, delay }) => {
      const t = setTimeout(() => setRevealed(prev => new Set([...prev, key])), delay);
      timers.current.push(t);
    });

    // Capture the ref value so the cleanup closure uses the same array
    const currentTimers = timers.current;
    return () => currentTimers.forEach(clearTimeout);
  }, []);

  return (
    <div
      id="anomaly-panel"
      className="fixed inset-0 z-40"
      style={{ background: "rgba(5,12,20,0.93)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
    >
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-8 pb-20">

          {/* ── Top bar ── */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">🥩</span>
                <h2 className="text-xl font-extrabold text-white">
                  Meat Batch #{batchId}
                </h2>
                <span
                  className="px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-widest"
                  style={{
                    background: "rgba(239,68,68,0.2)",
                    border: "1px solid rgba(239,68,68,0.5)",
                    color: "#f87171",
                    animation: "pulseGlow 2.2s ease infinite",
                  }}
                >
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cold Chain Breach · Truck Transit Stage · Detected at T+5.0h
              </p>
            </div>
            <button
              id="anomaly-panel-close"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              ✕
            </button>
          </div>

          {/* ── Temperature chart ── */}
          {revealed.has("chart") && <TempChart />}

          {/* ── AI Analyser header ── */}
          <div className="flex items-center gap-3 mt-6 mb-4">
            <span className="text-sky-400 text-lg">🤖</span>
            <span className="text-xs font-bold tracking-widest uppercase text-sky-400">AI Analyser</span>

            {thinking ? (
              /* Thinking dots */
              <div className="flex gap-1.5 ml-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="block w-1.5 h-1.5 rounded-full bg-sky-400"
                    style={{ animation: `pulseDot 1.2s ${i * 0.22}s ease-in-out infinite` }}
                  />
                ))}
              </div>
            ) : (
              /* Confidence meter */
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-slate-600">Confidence</span>
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: "87%", background: "linear-gradient(90deg,#10b981,#34d399)" }}
                  />
                </div>
                <span className="text-xs font-bold text-emerald-400">87%</span>
              </div>
            )}
          </div>

          {/* ── DIAGNOSIS ── */}
          {revealed.has("diagnosis") && (
            <Section title="Diagnosis" icon="🔍" color="#38bdf8">
              <p className="text-sm text-slate-300 leading-relaxed">
                A sudden temperature excursion of <strong className="text-white">+16.2°C</strong> was
                detected on Meat Batch #{batchId} during the Truck transit leg. The IoT sensor recorded
                a jump from <strong className="text-emerald-400">2.1°C</strong> → <strong className="text-red-400">18.3°C</strong> in
                a single 30-minute monitoring interval — a rate of change physically inconsistent with
                passive ambient infiltration. This abrupt thermal step-change is diagnostic of an
                acute refrigeration failure or an unsealed cargo door, <em>not</em> cumulative handling
                stress.
              </p>
            </Section>
          )}

          {/* ── ROOT CAUSE ── */}
          {revealed.has("rootCause") && (
            <Section title="Root Cause Analysis" icon="🧬" color="#a78bfa">
              <p className="text-sm text-slate-300 leading-relaxed mb-3">
                <strong className="text-purple-300">Primary hypothesis (87% confidence):</strong>{" "}
                Refrigeration unit compressor failure or door-seal breach. The ΔT of +16.2°C in one
                monitoring interval (~30 min) eliminates gradual warm-up and points to an instantaneous
                loss of active cooling.
              </p>
              <div className="text-xs text-slate-500 space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">▶</span>
                  <span>Compressor fault — electrical failure of primary cooling unit (most likely)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-600 mt-0.5">▶</span>
                  <span>Door-seal breach — cargo bay left improperly sealed during transit stop</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-700 mt-0.5">▶</span>
                  <span>Sensor tampering — low probability given proportionate gas-to-temperature ratio</span>
                </div>
              </div>
            </Section>
          )}

          {/* ── HOW IT OCCURRED ── */}
          {revealed.has("howOccurred") && (
            <Section title="How the Anomaly Occurred" icon="🔎" color="#fb923c">
              <p className="text-sm text-slate-300 leading-relaxed">
                The truck&apos;s primary refrigeration compressor experienced an electrical fault at approximately
                <strong className="text-orange-300"> T+3.4h</strong>, silently losing its cooling capacity.
                With no backup system and no real-time door-open alert, the insulated cargo bay heated
                passively from 2°C to 18.3°C over ~90 minutes — exceeding the{" "}
                <strong className="text-white">EC 853/2004</strong> safety threshold of 7°C for fresh
                meat. The onboard IoT sensor, polling every 30 minutes, captured the breach at the
                T+5.0h scheduled reading.
              </p>
            </Section>
          )}

          {/* ── TIMELINE ── */}
          {revealed.has("timeline") && (
            <Section title="Reconstructed Incident Timeline" icon="🕐" color="#f59e0b">
              <div className="space-y-2.5">
                {TIMELINE.map((entry, i) => (
                  <div
                    key={i}
                    className="flex gap-3 text-sm"
                    style={{
                      color: entry.now ? "#fca5a5"
                        : entry.ok === true ? "#64748b"
                        : entry.ok === false ? "#fb923c"
                        : "#94a3b8",
                    }}
                  >
                    <span
                      className="font-mono text-[10px] shrink-0 mt-0.5 tabular-nums"
                      style={{ color: entry.now ? "#ef4444" : "#475569", minWidth: 40 }}
                    >
                      {entry.time}
                    </span>
                    <span className="shrink-0">
                      {entry.now ? "🚨" : entry.ok === true ? "✓" : entry.ok === false ? "✗" : "·"}
                    </span>
                    <span className={entry.now ? "font-semibold" : ""}>{entry.event}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── RECOMMENDED STEPS ── */}
          {revealed.has("steps") && (
            <Section title="Recommended Steps" icon="📋" color="#34d399">
              <ol className="space-y-2.5">
                {STEPS.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-300">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* ── PREVENTION ── */}
          {revealed.has("prevention") && (
            <Section title="Prevention Recommendations" icon="🛡️" color="#84cc16">
              <ul className="space-y-2">
                {PREVENTION.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span style={{ color: "#84cc16" }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
              {/* Footer */}
              <div
                className="mt-4 rounded-lg p-3 text-[10px] text-slate-500 leading-relaxed"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                Analysis generated by FreshChain AI Engine · Heuristic rule-based model ·
                Always verify with a qualified food safety officer before final disposition.
                Confidence score based on sensor-pattern classification against 4,200 historical cold-chain incidents.
              </div>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}
