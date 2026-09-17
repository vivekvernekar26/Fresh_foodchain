"use client";

interface Props {
  value: number;
  min: number;
  max: number;
  ideal: number;
  color: string;
  label: string;
  unit: string;
  size?: number;
}

/**
 * Animated SVG arc gauge. The arc runs from 7 o'clock (225°) to 5 o'clock (315°,
 * i.e. 225+270=495° going clockwise), spanning 270° total — a standard gauge sweep.
 * An ideal-value notch is also drawn for reference.
 */
export default function SensorGauge({ value, min, max, ideal, color, label, unit, size = 80 }: Props) {
  const R = 32;
  const cx = 40;
  const cy = 40;
  const stroke = 5;

  // Arc helpers — angles in degrees from 12 o'clock, clockwise
  const START_DEG = 135;  // 7 o'clock
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

  const pct    = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const arcEnd = START_DEG + pct * SWEEP_DEG;

  const idealPct    = Math.max(0, Math.min(1, (ideal - min) / (max - min)));
  const idealAngle  = START_DEG + idealPct * SWEEP_DEG;
  const idealInner  = polarToXY(idealAngle, R - stroke * 0.5 - 4);
  const idealOuter  = polarToXY(idealAngle, R + stroke * 0.5 + 1);

  const displayVal = value.toFixed(1);

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        style={{ overflow: "visible" }}
      >
        {/* Track */}
        <path
          d={describeArc(START_DEG, START_DEG + SWEEP_DEG, R)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        {pct > 0 && (
          <path
            d={describeArc(START_DEG, arcEnd, R)}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 4px ${color}88)`,
              transition: "d 0.5s ease",
            }}
          />
        )}

        {/* Ideal-value notch */}
        <line
          x1={idealInner.x}
          y1={idealInner.y}
          x2={idealOuter.x}
          y2={idealOuter.y}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Centre value */}
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="11"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {displayVal}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize="7"
          fontFamily="Inter, sans-serif"
        >
          {unit}
        </text>
      </svg>
      <span className="text-[10px] text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}
