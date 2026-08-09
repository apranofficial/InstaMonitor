"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ACCENT = "#a198d6";

function dayKeyOf(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip glass-panel">
        <p className="tooltip-date">{label}</p>
        <div className="tooltip-item">
          <span className="tooltip-swatch" style={{ background: ACCENT }} />
          <span className="tooltip-label">Followers:</span>
          <span className="tooltip-value">
            {payload[0]?.value?.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

/**
 * Followers growth over time, built from each account's statsHistory
 * snapshots. When multiple accounts are shown, per-account values are
 * forward-filled and summed per day so sparse histories still chart.
 *
 * Props:
 *   data: scrape results — { [username]: { statsHistory: [...] } }
 *   selectedAccount: string | null
 *   accounts: string[] — all tracked usernames
 */
export function FollowersChart({ data, selectedAccount, accounts }) {
  const chartData = useMemo(() => {
    if (!data) return [];
    const usernames = selectedAccount ? [selectedAccount] : accounts;

    // Per-account: dayKey -> last snapshot value of that day.
    const perAccount = {};
    const allDays = new Set();

    for (const username of usernames) {
      const entry = data[username];
      const history = (!entry || Array.isArray(entry))
        ? []
        : entry.statsHistory || [];
      const byDay = {};
      for (const rec of history) {
        if (!rec?.date) continue;
        const key = dayKeyOf(rec.date);
        byDay[key] = rec.followersCount || 0;
        allDays.add(key);
      }
      perAccount[username] = byDay;
    }

    const sortedDays = [...allDays].sort();
    if (sortedDays.length === 0) return [];

    // Forward-fill each account across the day axis, then sum.
    const lastKnown = {};
    const points = [];
    for (const key of sortedDays) {
      let total = 0;
      for (const username of usernames) {
        if (perAccount[username][key] !== undefined) {
          lastKnown[username] = perAccount[username][key];
        }
        total += lastKnown[username] || 0;
      }
      const [y, m, d] = key.split("-").map(Number);
      points.push({
        dateLabel: new Date(y, m - 1, d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        followers: total,
      });
    }
    return points;
  }, [data, selectedAccount, accounts]);

  if (chartData.length === 0) {
    return (
      <div
        className="heatmap-container glass-panel"
        style={{ marginTop: "32px" }}
      >
        <h3 style={{ marginBottom: "8px" }}>
          Followers Growth
          {selectedAccount ? ` — @${selectedAccount}` : ""}
        </h3>
        <p className="chart-subtext">
          No snapshots yet — followers history starts recording on the next
          sync. Click &quot;Force Sync Now&quot; to take the first one.
        </p>
      </div>
    );
  }

  const single = chartData.length === 1;

  return (
    <div className="heatmap-container glass-panel" style={{ marginTop: "32px" }}>
      <h3 style={{ marginBottom: "8px" }}>
        Followers Growth
        {selectedAccount ? ` — @${selectedAccount}` : ""}
      </h3>
      <p className="chart-subtext">
        {single
          ? "One snapshot so far — growth appears after the next sync."
          : "Based on snapshots taken at each sync."}
      </p>
      <div style={{ width: "100%", height: "220px" }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
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
              domain={["auto", "auto"]}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
              }
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="followers"
              stroke={ACCENT}
              strokeWidth={2}
              dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
              activeDot={{
                r: 5,
                fill: ACCENT,
                stroke: "rgba(8,6,14,0.8)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
