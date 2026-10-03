"use client";

import { useEffect, useRef, useState } from "react";
import { formatCompactMoney, formatMoney, formatNumber } from "@/lib/format";

// Single-series charts in the monochrome theme: black marks on the white
// card, hairline recessive grid, no legend — the card title names the series.
const SERIES = "#111111";
const GRID = "#ebebeb";
const AXIS_TEXT = "#737373";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Revenue over time — 2px line over a 10% wash, crosshair + tooltip on hover. */
export function RevenueChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 260;
  const pad = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const max = niceMax(Math.max(...data.map((d) => d.revenue), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const x = (i: number) => pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join("");
  const area = data.length ? `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : "";
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 70))));

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round((px / rect.width) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const h = hover !== null ? data[hover] : null;
  const last = data[data.length - 1];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Daily revenue">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 10} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT}>
                {formatCompactMoney(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <text key={d.date} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                {shortDate(d.date)}
              </text>
            ) : null,
          )}
          <path d={area} fill={SERIES} fillOpacity={0.1} />
          <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {last && hover === null && <circle cx={x(data.length - 1)} cy={y(last.revenue)} r={4} fill={SERIES} stroke="#fff" strokeWidth={2} />}
          {h && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke={AXIS_TEXT} strokeWidth={1} />
              <circle cx={x(hover)} cy={y(h.revenue)} r={5} fill={SERIES} stroke="#fff" strokeWidth={2} />
            </g>
          )}
          <rect
            x={pad.left}
            y={pad.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-sm border border-cream-300 bg-white px-3 py-2 text-xs shadow-md"
          style={{
            left: Math.min(Math.max(x(hover) - 70, 0), Math.max(0, width - 150)),
            top: Math.max(0, y(h.revenue) - 64),
            width: 150,
          }}
        >
          <p className="font-semibold text-ink-900">{shortDate(h.date)}</p>
          <p className="mt-0.5 flex justify-between text-ink-700">
            <span>Revenue</span>
            <span className="font-semibold text-ink-900">{formatMoney(h.revenue)}</span>
          </p>
          <p className="flex justify-between text-ink-700">
            <span>Orders</span>
            <span className="font-semibold text-ink-900">{formatNumber(h.orders)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars — one hue, value at the tip, hover shows share. */
export function BarList({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.label} className="group grid grid-cols-[96px_1fr] items-center gap-3 text-sm" title={`${d.label}: ${d.value} (${total ? Math.round((d.value / total) * 100) : 0}%)`}>
          <span className="truncate text-ink-700">{d.label}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-4 rounded-r-[4px] transition-opacity group-hover:opacity-80"
              style={{ width: `${(d.value / max) * 85}%`, minWidth: d.value ? 4 : 0, background: SERIES }}
            />
            <span className="text-xs font-semibold text-ink-900 tabular-nums">{formatNumber(d.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
