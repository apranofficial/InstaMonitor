"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Custom Tooltip matching the Velune glassmorphism theme.
 */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip glass-panel">
        <p className="tooltip-date">{label}</p>
        <div className="tooltip-item">
          <span className="tooltip-swatch" style={{ background: "#8b80c5" }} />
          <span className="tooltip-label">Likes:</span>
          <span className="tooltip-value">
            {payload[0]?.value?.toLocaleString()}
          </span>
        </div>
        <div className="tooltip-item">
          <span className="tooltip-swatch" style={{ background: "#5a88ba" }} />
          <span className="tooltip-label">Views:</span>
          <span className="tooltip-value">
            {payload[1]?.value?.toLocaleString()}
          </span>
        </div>
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
              <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b80c5" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b80c5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5a88ba" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#5a88ba" stopOpacity={0} />
              </linearGradient>
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
            <Area
              type="monotone"
              dataKey="likes"
              stroke="#8b80c5"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorLikes)"
              activeDot={{ r: 4, fill: "#8b80c5", stroke: "rgba(8,6,14,0.8)", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke="#5a88ba"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorViews)"
              activeDot={{ r: 4, fill: "#5a88ba", stroke: "rgba(8,6,14,0.8)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
