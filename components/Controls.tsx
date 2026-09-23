"use client";

const SPEEDS = [0.5, 1, 2, 4] as const;

export default function Controls({
  running,
  setRunning,
  speed,
  setSpeed,
  batchCount,
  onInjectAnomaly,
  onAddBatch,
}: {
  running: boolean;
  setRunning: (v: boolean) => void;
  speed: number;
  setSpeed: (v: number) => void;
  batchCount: number;
  onInjectAnomaly: () => void;
  onAddBatch: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Live Simulation Status */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs">
        <span className={`w-2 h-2 rounded-full ${running ? "bg-emerald-500" : "bg-zinc-500"}`} />
        <span className="font-mono-data text-[11px] text-zinc-300">
          {running ? "LIVE" : "PAUSED"}
        </span>
        <span className="text-[10px] font-mono-data px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
          {batchCount} units
        </span>
      </div>

      {/* Speed Selector */}
      <div className="flex items-center rounded bg-zinc-900 p-0.5 border border-zinc-800">
        {SPEEDS.map((s) => {
          const isActive = speed === s;
          return (
            <button
              key={s}
              id={`btn-speed-${s}`}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 text-xs font-mono-data font-medium rounded transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s}×
            </button>
          );
        })}
      </div>

      {/* Play/Pause Button */}
      <button
        id="btn-toggle-run"
        onClick={() => setRunning(!running)}
        className="px-3 py-1.5 rounded text-xs font-mono-data font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-colors flex items-center gap-1.5"
      >
        <span>{running ? "⏸ Pause" : "▶ Resume"}</span>
      </button>

      {/* Inject Anomaly */}
      <button
        id="btn-inject-anomaly"
        onClick={onInjectAnomaly}
        className="px-3 py-1.5 rounded text-xs font-mono-data font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors flex items-center gap-1.5"
      >
        <span>⚡ Simulate Incident</span>
      </button>

      {/* Add Custom Batch */}
      <button
        id="btn-add-batch"
        onClick={onAddBatch}
        className="px-3 py-1.5 rounded text-xs font-mono-data font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors flex items-center gap-1"
      >
        <span>+ Dispatch Batch</span>
      </button>
    </div>
  );
}
