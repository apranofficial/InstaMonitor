"use client";

import { useMemo, useState } from "react";
import { TRACKED_ACCOUNTS } from "../config/accounts";
import { useScrapeData } from "../hooks/useScrapeData";
import { MonthlyCalendar } from "../components/MonthlyCalendar";

const DAY_MS = 24 * 60 * 60 * 1000;
const HEATMAP_DAYS = 30;

/** Returns a YYYY-MM-DD key for a Date, in local time. */
function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Computes all derived dashboard stats from the raw scrape results. */
function computeStats(data) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - HEATMAP_DAYS * DAY_MS);

  const accounts = [];
  let totalPosts = 0;
  let activeCount = 0;
  let mostActive = null;

  // Per-account, per-day post counts for the heatmap: { username: { "YYYY-MM-DD": n } }
  const dailyCounts = {};

  for (const [username, posts] of Object.entries(data)) {
    totalPosts += posts.length;

    let postsThisMonth = 0;
    let postsLast30 = 0;
    const days = {};

    for (const post of posts) {
      if (!post.timestamp) continue;
      const date = new Date(post.timestamp);
      if (Number.isNaN(date.getTime())) continue;

      if (date >= monthStart) postsThisMonth += 1;
      if (date >= thirtyDaysAgo) {
        postsLast30 += 1;
        const key = dayKey(date);
        days[key] = (days[key] || 0) + 1;
      }
    }

    dailyCounts[username] = days;
    if (postsLast30 > 0) activeCount += 1;
    if (!mostActive || postsLast30 > mostActive.postsLast30) {
      mostActive = { username, postsLast30 };
    }

    accounts.push({ name: username, postsThisMonth });
  }

  return { accounts, totalPosts, activeCount, mostActive, dailyCounts };
}

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard data">
      <div className="widgets-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="widget glass-panel">
            <div className="skeleton skeleton-label"></div>
            <div className="skeleton skeleton-value"></div>
          </div>
        ))}
      </div>
      <div className="heatmap-container glass-panel">
        <div className="skeleton skeleton-label" style={{ width: "220px" }}></div>
        <div className="loading-row">
          <div className="spinner" aria-hidden="true"></div>
          <p className="loading-text">Scraping latest Instagram data&hellip;</p>
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="heatmap-container glass-panel error-panel" role="alert">
      <h3>Something went wrong</h3>
      <p className="error-message">{message}</p>
      <button type="button" className="primary-button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { data, errors, loading, error, refetch } = useScrapeData(TRACKED_ACCOUNTS);
  const [selectedAccount, setSelectedAccount] = useState(null); // null = All Accounts

  const stats = useMemo(() => (data ? computeStats(data) : null), [data]);

  // Last 30 days, oldest first, one column per day.
  const heatmapDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const date = new Date(today.getTime() - i * DAY_MS);
      days.push({ key: dayKey(date), label: date.toLocaleDateString() });
    }
    return days;
  }, []);

  const heatmapAccounts = selectedAccount ? [selectedAccount] : TRACKED_ACCOUNTS;

  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <div className="sidebar-logo">F</div>
          <h2>Fleet</h2>
        </div>

        <div style={{ marginTop: "24px" }}>
          <p className="widget-title" style={{ marginBottom: "12px" }}>Your Accounts</p>
          <ul className="account-list">
            <li
              className={`account-item ${selectedAccount === null ? "active" : ""}`}
              onClick={() => setSelectedAccount(null)}
            >
              <span className="account-name">All Accounts</span>
              <span className="account-meta">
                {stats ? stats.totalPosts : "—"}
              </span>
            </li>
            {TRACKED_ACCOUNTS.map((name) => {
              const acc = stats?.accounts.find((a) => a.name === name);
              const failed = Boolean(errors[name]);
              return (
                <li
                  key={name}
                  className={`account-item ${selectedAccount === name ? "active" : ""}`}
                  onClick={() => setSelectedAccount(name)}
                  title={failed ? `Failed to load: ${errors[name]}` : undefined}
                >
                  <span className="account-name">@{name}</span>
                  <span className="account-meta">
                    {failed ? "!" : acc ? acc.postsThisMonth : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>Dashboard Overview</h1>
            <p>{monthLabel}</p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={refetch}
            disabled={loading}
          >
            {loading ? "Syncing…" : "Force Sync Now"}
          </button>
        </header>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <>
            {/* Widgets */}
            <div className="widgets-grid">
              <div className="widget glass-panel">
                <span className="widget-title">Total Posts</span>
                <span className="widget-value">{stats.totalPosts}</span>
              </div>
              <div className="widget glass-panel">
                <span className="widget-title">Active Accounts</span>
                <span className="widget-value">
                  {stats.activeCount} / {TRACKED_ACCOUNTS.length}
                </span>
              </div>
              <div className="widget glass-panel">
                <span className="widget-title">Most Active</span>
                <span className="widget-value" style={{ fontSize: "24px" }}>
                  {stats.mostActive && stats.mostActive.postsLast30 > 0
                    ? `@${stats.mostActive.username}`
                    : "—"}
                </span>
              </div>
            </div>

            {/* Per-account scrape errors (partial failures) */}
            {Object.keys(errors).length > 0 && (
              <div className="heatmap-container glass-panel error-panel">
                <h3>Some accounts failed to load</h3>
                {Object.entries(errors).map(([name, msg]) => (
                  <p key={name} className="error-message">
                    @{name}: {msg}
                  </p>
                ))}
                <button type="button" className="primary-button" onClick={refetch}>
                  Retry
                </button>
              </div>
            )}

            {/* Heatmap */}
            <div className="heatmap-container glass-panel">
              <h3 style={{ marginBottom: "16px" }}>
                Posting Activity (Last 30 Days)
                {selectedAccount ? ` — @${selectedAccount}` : ""}
              </h3>

              <div className="heatmap-grid">
                {heatmapDays.map((day) => (
                  <div key={day.key} className="heatmap-column">
                    {heatmapAccounts.map((username) => {
                      const count =
                        stats.dailyCounts[username]?.[day.key] || 0;
                      const level = Math.min(count, 4);
                      return (
                        <div
                          key={username}
                          className={`heat-cell heat-${level}`}
                          title={`@${username} — ${count} post${count === 1 ? "" : "s"} on ${day.label}`}
                        ></div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <MonthlyCalendar
              data={data}
              selectedAccount={selectedAccount}
              accounts={TRACKED_ACCOUNTS}
            />
          </>
        )}
      </main>
    </div>
  );
}
