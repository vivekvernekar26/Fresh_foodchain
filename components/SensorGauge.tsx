"use client";

interface Props {
  value: number;
  min: number;
  max: number;
  ideal: number;
  color?: string;
  label: string;
  unit: string;
  size?: number;
}

/**
 * Minimalist dark telemetry gauge.
 */
export default function SensorGauge({
  value,
  min,
  max,
  ideal,
  label,
  unit,
  size = 84,
}: Props) {
  const R = 30;
  const cx = 42;
  const cy = 42;
  const stroke = 4.5;

  const START_DEG = 135;
  const SWEEP_DEG = 270;

  function polarToXY(angleDeg: number, r: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(startDeg: number, endDeg: number, r: number) {
    const s = polarToXY(startDeg, r);
    const e = polarToXY(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const arcEnd = START_DEG + pct * SWEEP_DEG;

  const idealPct = Math.max(0, Math.min(1, (ideal - min) / (max - min)));
  const idealAngle = START_DEG + idealPct * SWEEP_DEG;
  const idealInner = polarToXY(idealAngle, R - stroke * 0.5 - 2);
  const idealOuter = polarToXY(idealAngle, R + stroke * 0.5 + 2);

  const displayVal = value.toFixed(1);

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 84 84"
        style={{ overflow: "visible" }}
      >
        {/* Inactive Track */}
        <path
          d={describeArc(START_DEG, START_DEG + SWEEP_DEG, R)}
          fill="none"
          stroke="#27272a"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Active Arc Fill (Clean light zinc) */}
        {pct > 0 && (
          <path
            d={describeArc(START_DEG, arcEnd, R)}
            fill="none"
            stroke="#d4d4d8"
            strokeWidth={stroke}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.2s ease" }}
          />
        )}

        {/* Ideal Marker */}
        <line
          x1={idealInner.x}
          y1={idealInner.y}
          x2={idealOuter.x}
          y2={idealOuter.y}
          stroke="#71717a"
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Value Text */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono-data font-semibold text-zinc-100"
          style={{
            fontSize: displayVal.length > 4 ? "12px" : "13px",
            fill: "#f4f4f5",
          }}
        >
          {displayVal}
          <tspan style={{ fontSize: "9px", fill: "#71717a", fontWeight: 400 }}>
            {unit}
          </tspan>
        </text>

        {/* Label */}
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: "8px",
            fill: "#71717a",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
