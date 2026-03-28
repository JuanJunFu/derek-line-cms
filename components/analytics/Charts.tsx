"use client";

// ── Donut Chart (圓餅圖) ──
export function DonutChart({
  data,
  title,
}: {
  data: { label: string; value: number; color: string }[];
  title: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4">
        <h2 className="text-sm font-bold text-[var(--brand-accent)] mb-4">{title}</h2>
        <p className="text-sm text-[var(--text-muted)] text-center py-8">尚無數據</p>
      </div>
    );
  }

  // Build conic gradient stops
  let accumulated = 0;
  const stops = data.map((d) => {
    const start = accumulated;
    const pct = (d.value / total) * 100;
    accumulated += pct;
    return `${d.color} ${start}% ${accumulated}%`;
  });

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4">
      <h2 className="text-sm font-bold text-[var(--brand-accent)] mb-4">{title}</h2>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <div
            className="w-full h-full rounded-full"
            style={{
              background: `conic-gradient(${stops.join(", ")})`,
            }}
          />
          {/* Center hole */}
          <div className="absolute inset-4 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-[var(--brand-accent)]">{total}</span>
          </div>
        </div>
        {/* Legend */}
        <div className="space-y-2 flex-1">
          {data.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-xs text-[var(--text-secondary)]">{d.label}</span>
              </div>
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bar Chart (長條圖) ──
export function BarChart({
  data,
  title,
}: {
  data: { label: string; value: number; color?: string }[];
  title: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4">
      <h2 className="text-sm font-bold text-[var(--brand-accent)] mb-4">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">尚無數據</p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--text-secondary)]">{d.label}</span>
                <span className="text-[var(--brand-accent)] font-bold">{d.value} 次</span>
              </div>
              <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-4">
                <div
                  className="h-4 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max((d.value / max) * 100, 2)}%`,
                    backgroundColor: d.color ?? "#B89A6A",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trend Line (7天趨勢) ──
export function TrendLine({
  data,
  title,
}: {
  data: { date: string; value: number }[];
  title: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const height = 120;
  const width = 100; // percentage

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4">
      <h2 className="text-sm font-bold text-[var(--brand-accent)] mb-4">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">尚無數據</p>
      ) : (
        <div>
          {/* SVG Line Chart */}
          <svg viewBox={`0 0 ${data.length * 50} ${height + 20}`} className="w-full h-32">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <line
                key={pct}
                x1="0"
                y1={height - pct * height}
                x2={data.length * 50}
                y2={height - pct * height}
                stroke="#333"
                strokeWidth="0.5"
              />
            ))}
            {/* Line */}
            <polyline
              fill="none"
              stroke="#B89A6A"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points={data
                .map(
                  (d, i) =>
                    `${i * 50 + 25},${height - (d.value / max) * (height - 10)}`
                )
                .join(" ")}
            />
            {/* Dots */}
            {data.map((d, i) => (
              <circle
                key={i}
                cx={i * 50 + 25}
                cy={height - (d.value / max) * (height - 10)}
                r="4"
                fill="#B89A6A"
                stroke="#1a1a1a"
                strokeWidth="2"
              />
            ))}
            {/* Labels */}
            {data.map((d, i) => (
              <text
                key={`label-${i}`}
                x={i * 50 + 25}
                y={height + 15}
                textAnchor="middle"
                fill="#666"
                fontSize="10"
              >
                {d.date}
              </text>
            ))}
            {/* Values */}
            {data.map((d, i) => (
              <text
                key={`val-${i}`}
                x={i * 50 + 25}
                y={height - (d.value / max) * (height - 10) - 10}
                textAnchor="middle"
                fill="#B89A6A"
                fontSize="10"
                fontWeight="bold"
              >
                {d.value}
              </text>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
