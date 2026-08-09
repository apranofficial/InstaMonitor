"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fetches scraped post data for a list of Instagram usernames
 * from POST /api/scrape and exposes loading / error / retry state.
 *
 * Returned shape:
 *   data    — { [username]: Post[] } or null while loading/failed
 *   errors  — { [username]: string } per-account scrape errors (partial failures)
 *   loading — true while a request is in flight
 *   error   — top-level error message when the whole request failed
 *   refetch — re-fetch (cached, free); refetch({ force: true }) re-scrapes
 *             via Apify and is only used by the Force Sync button.
 *   meta    — { [username]: { fromCache, scrapedAt } } sync info per account
 */
export function useScrapeData(usernames) {
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState({});
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track the latest request so a stale response never overwrites newer data.
  const requestIdRef = useRef(0);

  const fetchData = useCallback(
    async ({ force = false } = {}) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames, forceRefresh: force }),
        });

        const json = await res.json().catch(() => null);

        if (requestId !== requestIdRef.current) return;

        if (!res.ok) {
          const message =
            json?.error ||
            (json?.errors && Object.values(json.errors)[0]) ||
            `Request failed with status ${res.status}`;
          throw new Error(message);
        }

        setData(json.results || {});
        setErrors(json.errors || {});
        setMeta(json.meta || {});
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err.message || "Failed to fetch data.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [usernames]
  );

  useEffect(() => {
    // Initial load never forces a scrape — cached data is free.
    fetchData();
  }, [fetchData]);

  return { data, errors, meta, loading, error, refetch: fetchData };
}
