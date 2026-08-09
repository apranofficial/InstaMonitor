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
 *   refetch — re-run the scrape (used by retry + Force Sync)
 */
export function useScrapeData(usernames) {
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track the latest request so a stale response never overwrites newer data.
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames }),
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
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || "Failed to fetch data.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [usernames]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, errors, loading, error, refetch: fetchData };
}
