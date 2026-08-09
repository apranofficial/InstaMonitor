"use client";

import { useMemo, useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Returns a YYYY-MM-DD key for a Date, in local time. */
function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Groups posts by local day for the given accounts. */
function groupPostsByDay(data, accounts) {
  const byDay = {};
  for (const username of accounts) {
    const posts = data[username] || [];
    for (const post of posts) {
      if (!post.timestamp) continue;
      const date = new Date(post.timestamp);
      if (Number.isNaN(date.getTime())) continue;
      const key = dayKey(date);
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push({ ...post, username });
    }
  }
  // Newest first within each day.
  for (const key of Object.keys(byDay)) {
    byDay[key].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  return byDay;
}

/** Builds the cell list for a month grid: leading blanks + real days. */
function buildMonthCells(year, month) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay.getDay(); i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

function formatCount(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function PostCard({ post }) {
  const caption = post.caption
    ? post.caption.length > 90
      ? `${post.caption.slice(0, 90)}…`
      : post.caption
    : "No caption";

  return (
    <article className="post-card">
      {post.displayUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.displayUrl}
          alt={`Instagram post by @${post.username}`}
          className="post-thumb"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.add("visible");
          }}
        />
      ) : null}
      <div
        className={`post-thumb-fallback ${post.displayUrl ? "" : "visible"}`}
        aria-hidden="true"
      >
        {post.type === "Video" ? "▶" : "◫"}
      </div>
      <div className="post-card-body">
        <div className="post-card-meta">
          <span className="post-card-account">@{post.username}</span>
          <span className="post-card-time">
            {new Date(post.timestamp).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="post-card-caption">{caption}</p>
        <div className="post-card-stats">
          <span title="Likes">{formatCount(post.likesCount || 0)} likes</span>
          <span title="Comments">
            {formatCount(post.commentsCount || 0)} comments
          </span>
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="post-card-link"
            >
              View Post ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Monthly calendar showing per-day post activity with month navigation
 * and an expandable day-detail panel.
 *
 * Props:
 *   data            — { [username]: Post[] }
 *   selectedAccount — username string or null for all accounts
 *   accounts        — full list of tracked usernames
 */
export function MonthlyCalendar({ data, selectedAccount, accounts }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null); // YYYY-MM-DD
  const [slideDir, setSlideDir] = useState(null); // "left" | "right"

  const activeAccounts = selectedAccount ? [selectedAccount] : accounts;

  const postsByDay = useMemo(
    () => groupPostsByDay(data, activeAccounts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, selectedAccount]
  );

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const todayKey = dayKey(today);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  function navigate(delta) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setSlideDir(delta > 0 ? "left" : "right");
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelectedDay(null);
  }

  function handleDayClick(key, hasPosts) {
    if (!hasPosts) return;
    setSelectedDay((prev) => (prev === key ? null : key));
  }

  const selectedPosts = selectedDay ? postsByDay[selectedDay] || [] : [];
  const selectedDayLabel = selectedDay
    ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="heatmap-container glass-panel calendar-panel">
      <div className="calendar-header">
        <h3>
          Monthly Calendar
          {selectedAccount ? ` — @${selectedAccount}` : " — All Accounts"}
        </h3>
        <div className="calendar-nav">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => navigate(-1)}
            aria-label="Previous month"
          >
            &#8592;
          </button>
          <span className="calendar-month-label" aria-live="polite">
            {monthLabel}
          </span>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => navigate(1)}
            aria-label="Next month"
          >
            &#8594;
          </button>
        </div>
      </div>

      <div
        key={`${viewYear}-${viewMonth}`}
        className={`calendar-body ${
          slideDir === "left"
            ? "slide-in-left"
            : slideDir === "right"
              ? "slide-in-right"
              : ""
        }`}
      >
        <div className="calendar-grid calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid" role="grid">
          {cells.map((date, i) => {
            if (!date) {
              return <div key={`blank-${i}`} className="calendar-cell blank" />;
            }
            const key = dayKey(date);
            const posts = postsByDay[key] || [];
            const count = posts.length;
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const classNames = [
              "calendar-cell",
              count > 0 ? "has-posts" : "no-posts",
              isToday ? "is-today" : "",
              isSelected ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={key}
                type="button"
                className={classNames}
                onClick={() => handleDayClick(key, count > 0)}
                disabled={count === 0}
                aria-pressed={isSelected}
                aria-label={`${date.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}, ${count} post${count === 1 ? "" : "s"}`}
              >
                <span className="calendar-day-number">{date.getDate()}</span>
                {count > 0 && (
                  <span className="calendar-day-badge">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="day-detail" role="region" aria-label="Day details">
          <div className="day-detail-header">
            <h4>
              {selectedDayLabel} &middot; {selectedPosts.length} post
              {selectedPosts.length === 1 ? "" : "s"}
            </h4>
            <button
              type="button"
              className="day-detail-close"
              onClick={() => setSelectedDay(null)}
              aria-label="Close day details"
            >
              &#10005;
            </button>
          </div>
          <div className="day-detail-posts">
            {selectedPosts.map((post, i) => (
              <PostCard key={post.url || i} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
