import { useState } from 'react';

export interface TrendPoint {
  date: string;
  value: number;
}

const W = 600;
const H = 160;
const PAD_Y = 12;

/**
 * Single-series area trend. One hue (the tenant accent) since color carries no
 * identity here; values surface through the hover crosshair + tooltip, labels
 * stay in ink tokens.
 */
export default function TrendChart({
  points,
  formatValue = (v) => v.toLocaleString(),
}: {
  points: TrendPoint[];
  formatValue?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * W : W / 2);
  const y = (v: number) => H - PAD_Y - (v / max) * (H - 2 * PAD_Y);
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W},${H - PAD_Y} L0,${H - PAD_Y} Z`;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    setHover(Math.min(points.length - 1, Math.max(0, Math.round(frac * (points.length - 1)))));
  }

  const hovered = hover != null ? points[hover] : null;

  return (
    <div className="relative">
      <div className="flex justify-between text-[11px] text-neutral-500 mb-1 tabular-nums">
        <span>{formatValue(max)} max</span>
        {hovered && (
          <span className="text-neutral-300">
            {hovered.date} — {formatValue(hovered.value)}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-36 block"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[y(max), y(max / 2), H - PAD_Y].map((gy) => (
          <line
            key={gy}
            x1={0}
            x2={W}
            y1={gy}
            y2={gy}
            className="stroke-neutral-800"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill="var(--accent)" opacity={0.12} />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {hover != null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD_Y / 2}
              y2={H - PAD_Y}
              className="stroke-neutral-600"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x(hover)}
              cy={y(points[hover].value)}
              r={4}
              fill="var(--accent)"
              stroke="#0a0a0a"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
      <div className="flex justify-between text-[11px] text-neutral-500 mt-1 tabular-nums">
        <span>{points[0].date}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}
