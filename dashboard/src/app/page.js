"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useScrapeData } from "../hooks/useScrapeData";
import { MonthlyCalendar } from "../components/MonthlyCalendar";
import { HandlersTable } from "../components/HandlersTable";
import { HandlerModal } from "../components/HandlerModal";
import { AnalyticsChart } from "../components/AnalyticsChart";

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
function computeStats(data, trackedAccounts) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - HEATMAP_DAYS * DAY_MS);
  const sixtyDaysAgo = new Date(now.getTime() - HEATMAP_DAYS * 2 * DAY_MS);
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const accounts = [];
  const dailyCounts = {};
  const dailyMetrics = {};
  const accountStats = {};

  let globalPosts = 0;
  let globalFollowers = 0;
  let globalFollowersGrowth = 0;
  let globalViews = 0;
  let globalViewsLastMonth = 0;
  let globalViewsThisMonth = 0;

  for (const username of trackedAccounts) {
    const accountData = data[username];
    if (!accountData) continue;

    let posts = [];
    let followersCount = 0;
    let statsHistory = [];
    
    if (Array.isArray(accountData)) {
      posts = accountData;
    } else {
      posts = accountData.posts || [];
      followersCount = accountData.followersCount || 0;
      statsHistory = accountData.statsHistory || [];
    }

    // Follower growth logic
    let followersGrowth = 0;
    if (statsHistory.length > 0) {
      const targetDate = now.getTime() - thirtyDaysMs;
      let closestRecord = null;
      let minDiff = Infinity;
      for (const record of statsHistory) {
        if (!record.date) continue;
        const diff = Math.abs(new Date(record.date).getTime() - targetDate);
        if (diff < minDiff) {
          minDiff = diff;
          closestRecord = record;
        }
      }
      if (closestRecord && minDiff < thirtyDaysMs) {
        const oldestRecord = statsHistory.reduce((oldest, current) => {
          return new Date(current.date) < new Date(oldest.date) ? current : oldest;
        }, statsHistory[0]);
        followersGrowth = (followersCount - oldestRecord.followersCount);
      }
    }

    let postsThisMonth = 0;
    let accountViews = 0;
    let accountViewsThisMonth = 0;
    let accountViewsLastMonth = 0;
    const days = {};

    for (const post of posts) {
      if (!post.timestamp) continue;
      const date = new Date(post.timestamp);
      if (Number.isNaN(date.getTime())) continue;

      const vCount = post.viewsCount || 0;
      accountViews += vCount;

      if (date >= thirtyDaysAgo) {
        accountViewsThisMonth += vCount;
      } else if (date >= sixtyDaysAgo && date < thirtyDaysAgo) {
        accountViewsLastMonth += vCount;
      }

      if (date >= monthStart) postsThisMonth += 1;
      if (date >= thirtyDaysAgo) {
        const key = dayKey(date);
        days[key] = (days[key] || 0) + 1;
        
        if (!dailyMetrics[username]) dailyMetrics[username] = {};
        if (!dailyMetrics[username][key]) dailyMetrics[username][key] = { likes: 0, views: 0 };
        dailyMetrics[username][key].likes += (post.likesCount || 0);
        dailyMetrics[username][key].views += vCount;
      }
    }

    dailyCounts[username] = days;
    accounts.push({ name: username, postsThisMonth });

    accountStats[username] = {
      totalPosts: posts.length,
      totalFollowers: followersCount,
      followersGrowth,
      totalViews: accountViews,
      viewsGrowth: accountViewsThisMonth - accountViewsLastMonth,
    };

    globalPosts += posts.length;
    globalFollowers += followersCount;
    globalFollowersGrowth += followersGrowth;
    globalViews += accountViews;
    globalViewsThisMonth += accountViewsThisMonth;
    globalViewsLastMonth += accountViewsLastMonth;
  }

  return {
    accounts,
    dailyCounts,
    dailyMetrics,
    accountStats,
    globalStats: {
      totalPosts: globalPosts,
      totalFollowers: globalFollowers,
      followersGrowth: globalFollowersGrowth,
      totalViews: globalViews,
      viewsGrowth: globalViewsThisMonth - globalViewsLastMonth,
    },
  };
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
  // --- Handlers state (from MongoDB) ---
  const [handlers, setHandlers] = useState([]);
  const [handlersLoading, setHandlersLoading] = useState(true);
  const [modalHandler, setModalHandler] = useState(undefined); // undefined=closed, null=add, handler=edit
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "handlers"

  // Derive tracked accounts from handlers
  const trackedAccounts = useMemo(() => {
    const all = new Set();
    for (const h of handlers) {
      for (const a of h.accounts) all.add(a);
    }
    return [...all].sort();
  }, [handlers]);

  // Build handler lookup: account -> handler name
  const accountHandlerMap = useMemo(() => {
    const map = {};
    for (const h of handlers) {
      for (const a of h.accounts) {
        map[a] = h.handlerName;
      }
    }
    return map;
  }, [handlers]);

  // Fetch handlers from MongoDB
  const fetchHandlers = useCallback(async () => {
    setHandlersLoading(true);
    try {
      const res = await fetch("/api/handlers");
      const json = await res.json();
      if (res.ok && json.handlers) {
        setHandlers(json.handlers);
      }
    } catch (err) {
      console.error("Failed to fetch handlers:", err);
    } finally {
      setHandlersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHandlers();
  }, [fetchHandlers]);

  // --- Scrape data ---
  const { data, errors, loading, error, refetch } = useScrapeData(trackedAccounts);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const stats = useMemo(
    () => (data ? computeStats(data, trackedAccounts) : null),
    [data, trackedAccounts]
  );

  const heatmapDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const date = new Date(today.getTime() - i * DAY_MS);
      days.push({ key: dayKey(date), label: date.toLocaleDateString() });
    }
    return days;
  }, []);

  const heatmapAccounts = selectedAccount ? [selectedAccount] : trackedAccounts;

  const chartData = useMemo(() => {
    if (!stats) return [];
    
    const today = new Date();
    const days = [];
    const accountsToTally = selectedAccount ? [selectedAccount] : trackedAccounts;

    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const date = new Date(today.getTime() - i * DAY_MS);
      const key = dayKey(date);
      
      let likes = 0;
      let views = 0;

      for (const username of accountsToTally) {
        const metrics = stats.dailyMetrics[username]?.[key];
        if (metrics) {
          likes += metrics.likes;
          views += metrics.views;
        }
      }

      days.push({
        dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        likes,
        views,
      });
    }
    return days;
  }, [stats, selectedAccount, trackedAccounts]);

  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // --- Handler CRUD callbacks ---
  const handleSaved = (savedHandler) => {
    setHandlers((prev) => {
      const idx = prev.findIndex((h) => h._id === savedHandler._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedHandler;
        return next;
      }
      return [savedHandler, ...prev];
    });
    setModalHandler(undefined);
  };

  const handleDeleted = (id) => {
    setHandlers((prev) => prev.filter((h) => h._id !== id));
  };

  // Group accounts by handler for sidebar display
  const sidebarGroups = useMemo(() => {
    const groups = [];
    for (const h of handlers) {
      groups.push({
        handlerName: h.handlerName,
        accounts: h.accounts,
      });
    }
    return groups;
  }, [handlers]);

  const activeStats = selectedAccount 
    ? stats?.accountStats?.[selectedAccount] 
    : stats?.globalStats;

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <div className="sidebar-logo">F</div>
          <h2>Fleet</h2>
        </div>

        <div style={{ marginTop: "24px" }}>
          <p className="widget-title" style={{ marginBottom: "12px" }}>Accounts</p>
          <ul className="account-list">
            <li
              className={`account-item ${selectedAccount === null ? "active" : ""}`}
              onClick={() => setSelectedAccount(null)}
            >
              <span className="account-name">All Accounts</span>
              <span className="account-meta">
                {stats ? stats.globalStats?.totalPosts : "—"}
              </span>
            </li>

            {sidebarGroups.map((group) => (
              <li key={group.handlerName} className="sidebar-group">
                <span className="sidebar-group-label">{group.handlerName}</span>
                <ul className="account-list">
                  {group.accounts.map((name) => {
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
              </li>
            ))}
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
          <div className="header-actions">
            <div className="tab-bar">
              <button
                type="button"
                className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "handlers" ? "active" : ""}`}
                onClick={() => setActiveTab("handlers")}
              >
                Handlers
              </button>
            </div>
            {activeTab === "handlers" ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => setModalHandler(null)}
              >
                + Add Handler
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={() => refetch({ force: true })}
                disabled={loading}
                title="Re-scrapes all accounts via Apify (uses credits)"
              >
                {loading ? "Syncing…" : "Force Sync Now"}
              </button>
            )}
          </div>
        </header>

        {activeTab === "overview" ? (
          <>
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <ErrorState message={error} onRetry={() => refetch()} />
            ) : trackedAccounts.length === 0 ? (
              <div className="heatmap-container glass-panel">
                <h3>No accounts to track</h3>
                <p className="error-message">
                  Switch to the <strong>Handlers</strong> tab to add page handlers
                  and their Instagram accounts, or share the{" "}
                  <a href="/register" className="handlers-register-link">
                    registration form
                  </a>.
                </p>
              </div>
            ) : (
              <div className="dashboard-content fade-in">
                {/* Stats Widgets */}
                <div className="widgets-grid">
                  <div className="widget glass-panel">
                    <p className="widget-label">Total Followers</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 className="widget-value">{activeStats.totalFollowers.toLocaleString()}</h2>
                      {activeStats.followersGrowth > 0 && (
                        <span className="growth-badge positive">+{activeStats.followersGrowth.toLocaleString()} /mo</span>
                      )}
                      {activeStats.followersGrowth < 0 && (
                        <span className="growth-badge negative">{activeStats.followersGrowth.toLocaleString()} /mo</span>
                      )}
                    </div>
                  </div>

                  <div className="widget glass-panel">
                    <p className="widget-label">Total Views</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 className="widget-value">
                        {activeStats.totalViews >= 1000 
                          ? `${(activeStats.totalViews / 1000).toFixed(1)}k` 
                          : activeStats.totalViews}
                      </h2>
                      {activeStats.viewsGrowth > 0 && (
                        <span className="growth-badge positive">+{activeStats.viewsGrowth.toLocaleString()} /mo</span>
                      )}
                      {activeStats.viewsGrowth < 0 && (
                        <span className="growth-badge negative">{activeStats.viewsGrowth.toLocaleString()} /mo</span>
                      )}
                    </div>
                  </div>

                  <div className="widget glass-panel">
                    <p className="widget-label">Total Posts</p>
                    <h2 className="widget-value">{activeStats.totalPosts.toLocaleString()}</h2>
                  </div>
                </div>

                {/* Per-account scrape errors */}
                {Object.keys(errors).length > 0 && (
                  <div className="heatmap-container glass-panel error-panel">
                    <h3>Some accounts failed to load</h3>
                    {Object.entries(errors).map(([name, msg]) => (
                      <p key={name} className="error-message">
                        @{name}: {msg}
                      </p>
                    ))}
                    <button type="button" className="primary-button" onClick={() => refetch()}>
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

                <AnalyticsChart
                  data={chartData}
                  title={selectedAccount ? `Performance Growth — @${selectedAccount}` : "Overall Performance Growth"}
                />

                <MonthlyCalendar
                  data={data}
                  selectedAccount={selectedAccount}
                  accounts={trackedAccounts}
                />
              </div>
            )}
          </>
        ) : (
          /* Handlers Tab */
          <HandlersTable
            handlers={handlers}
            onEdit={(h) => setModalHandler(h)}
            onDeleted={handleDeleted}
            loading={handlersLoading}
          />
        )}
      </main>

      {/* Handler Modal (add/edit) */}
      {modalHandler !== undefined && (
        <HandlerModal
          handler={modalHandler}
          onClose={() => setModalHandler(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
