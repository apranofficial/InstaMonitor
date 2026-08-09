"use client";

import { useMemo } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

function formatCount(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/**
 * Computes per-handler performance over the last 30 days:
 * posts made, active days, engagement, views, followers — against
 * what the handler is paid.
 */
function computePerformance(handlers, data) {
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

  return handlers.map((handler) => {
    let posts30 = 0;
    let likes = 0;
    let comments = 0;
    let views = 0;
    let followers = 0;
    const activeDays = new Set();
    const perAccount = [];

    for (const username of handler.accounts) {
      const entry = data?.[username];
      const accountPosts = !entry
        ? []
        : Array.isArray(entry)
          ? entry
          : entry.posts || [];
      if (entry && !Array.isArray(entry)) {
        followers += entry.followersCount || 0;
      }

      let accPosts30 = 0;
      const accActiveDays = new Set();
      for (const post of accountPosts) {
        if (!post.timestamp) continue;
        const date = new Date(post.timestamp);
        if (Number.isNaN(date.getTime()) || date < since) continue;
        accPosts30 += 1;
        likes += post.likesCount || 0;
        comments += post.commentsCount || 0;
        views += post.viewsCount || 0;
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        activeDays.add(key);
        accActiveDays.add(key);
      }
      posts30 += accPosts30;
      perAccount.push({
        username,
        posts30,
        postsCount: accPosts30,
        activeDays: accActiveDays.size,
      });
    }

    const engagement = likes + comments;
    const monthlyPay = handler.monthlyPay || 0;
    const costPerPost = posts30 > 0 ? monthlyPay / posts30 : null;

    return {
      id: handler._id,
      name: handler.handlerName,
      currency: handler.currency || "\u20B9",
      monthlyPay,
      accountCount: handler.accounts.length,
      posts30,
      activeDays: activeDays.size,
      engagement,
      views,
      followers,
      costPerPost,
      perAccount,
    };
  });
}

/** 0-100 score used for the activity bar: posting on 15+ of 30 days = full. */
function activityPct(activeDays) {
  return Math.min(100, Math.round((activeDays / 15) * 100));
}

export function HandlerPerformance({ handlers, data, loading }) {
  const rows = useMemo(
    () => computePerformance(handlers, data),
    [handlers, data]
  );

  if (loading) {
    return (
      <div className="heatmap-container glass-panel">
        <div className="loading-row">
          <div className="spinner" aria-hidden="true"></div>
          <p className="loading-text">Computing handler performance&hellip;</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="heatmap-container glass-panel">
        <h3>No handlers yet</h3>
        <p className="error-message">
          Add handlers in the Handlers tab to see their performance.
        </p>
      </div>
    );
  }

  return (
    <div className="performance-grid fade-in">
      {rows.map((row) => (
        <article key={row.id} className="performance-card glass-panel">
          <header className="performance-card-header">
            <div>
              <h3>{row.name}</h3>
              <p className="performance-sub">
                {row.accountCount} account{row.accountCount === 1 ? "" : "s"}
                {" · "}
                {row.currency}
                {row.monthlyPay.toLocaleString()}/mo
              </p>
            </div>
            <div
              className="performance-score"
              title={`Posted on ${row.activeDays} of the last ${WINDOW_DAYS} days`}
            >
              <span className="performance-score-value">{row.activeDays}</span>
              <span className="performance-score-label">active days</span>
            </div>
          </header>

          <div
            className="activity-bar"
            role="progressbar"
            aria-valuenow={row.activeDays}
            aria-valuemin={0}
            aria-valuemax={WINDOW_DAYS}
            aria-label={`${row.name} posted on ${row.activeDays} of the last ${WINDOW_DAYS} days`}
          >
            <div
              className="activity-bar-fill"
              style={{ width: `${activityPct(row.activeDays)}%` }}
            ></div>
          </div>

          <dl className="performance-stats">
            <div className="performance-stat">
              <dt>Posts (30d)</dt>
              <dd>{row.posts30}</dd>
            </div>
            <div className="performance-stat">
              <dt>Engagement</dt>
              <dd>{formatCount(row.engagement)}</dd>
            </div>
            <div className="performance-stat">
              <dt>Views</dt>
              <dd>{formatCount(row.views)}</dd>
            </div>
            <div className="performance-stat">
              <dt>Followers</dt>
              <dd>{formatCount(row.followers)}</dd>
            </div>
            <div className="performance-stat">
              <dt>Cost / post</dt>
              <dd>
                {row.costPerPost === null
                  ? "\u2014"
                  : `${row.currency}${Math.round(row.costPerPost).toLocaleString()}`}
              </dd>
            </div>
          </dl>

          <ul className="performance-accounts">
            {row.perAccount.map((acc) => (
              <li key={acc.username}>
                <span className="performance-account-name">@{acc.username}</span>
                <span className="performance-account-meta">
                  {acc.postsCount} post{acc.postsCount === 1 ? "" : "s"} ·{" "}
                  {acc.activeDays} active day{acc.activeDays === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
