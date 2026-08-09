"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SERIES = [
  { key: "likes", label: "Likes", color: "#8b80c5" },
  { key: "comments", label: "Comments", color: "#8fbfa8" },
  { key: "views", label: "Views", color: "#5a88ba" },
];

/**
 * Custom Tooltip matching the Velune glassmorphism theme.
 */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip glass-panel">
        <p className="tooltip-date">{label}</p>
        {payload.map((entry) => {
          const series = SERIES.find((s) => s.key === entry.dataKey);
          return (
            <div key={entry.dataKey} className="tooltip-item">
              <span
                className="tooltip-swatch"
                style={{ background: series?.color || entry.color }}
              />
              <span className="tooltip-label">{series?.label || entry.dataKey}:</span>
              <span className="tooltip-value">
                {entry.value?.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

/**
 * Renders an AreaChart for Likes and Views.
 *
 * Props:
 *   data: Array of { dateLabel: string, likes: number, views: number }
 *   title: string
 */
export function AnalyticsChart({ data, title }) {
  if (!data || data.length === 0) {
    return null;
  }

  // To prevent the chart from looking flat if numbers are small,
  // we let Recharts auto-scale. But if all numbers are 0, it still looks flat.
  
  return (
    <div className="heatmap-container glass-panel" style={{ marginTop: "32px" }}>
      <h3 style={{ marginBottom: "24px" }}>{title}</h3>
      <div style={{ width: "100%", height: "280px" }}>
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              {SERIES.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`color-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="dateLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              dy={10}
              minTickGap={20}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
              }
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#color-${s.key})`}
                activeDot={{
                  r: 4,
                  fill: s.color,
                  stroke: "rgba(8,6,14,0.8)",
                  strokeWidth: 2,
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        {SERIES.map((s) => (
          <span key={s.key} className="chart-legend-item">
            <span className="tooltip-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
