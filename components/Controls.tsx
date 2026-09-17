const SPEEDS = [0.5, 1, 2, 4] as const;

export default function Controls({
  running,
  setRunning,
  speed,
  setSpeed,
  onInjectAnomaly,
}: {
  running: boolean;
  setRunning: (v: boolean) => void;
  speed: number;
  setSpeed: (v: number) => void;
  onInjectAnomaly: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Pause / Resume */}
      <button
        id="btn-pause-resume"
        onClick={() => setRunning(!running)}
        className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200"
        style={{
          background: running
            ? "rgba(255,255,255,0.08)"
            : "rgba(16,185,129,0.18)",
          border: `1px solid ${running ? "rgba(255,255,255,0.14)" : "rgba(16,185,129,0.45)"}`,
          color: running ? "#cbd5e1" : "#34d399",
        }}
      >
        {running ? (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="1" y="1" width="4" height="10" rx="1" />
              <rect x="7" y="1" width="4" height="10" rx="1" />
            </svg>
            Pause
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <polygon points="2,1 11,6 2,11" />
            </svg>
            Resume
          </>
        )}
      </button>

      {/* Speed pills */}
      <div className="flex items-center gap-1 rounded-full p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="px-2 text-xs text-slate-500">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            id={`btn-speed-${s}`}
            onClick={() => setSpeed(s)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150"
            style={{
              background: speed === s ? "rgba(56,189,248,0.22)" : "transparent",
              color: speed === s ? "#38bdf8" : "#64748b",
              border: speed === s ? "1px solid rgba(56,189,248,0.4)" : "1px solid transparent",
            }}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* Inject Anomaly */}
      <button
        id="btn-inject-anomaly"
        onClick={onInjectAnomaly}
        className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: "rgba(239,68,68,0.18)",
          border: "1px solid rgba(239,68,68,0.45)",
          color: "#f87171",
          animation: "pulseGlow 2.5s ease infinite",
        }}
      >
        ⚡ Inject Anomaly
      </button>
    </div>
  );
}
