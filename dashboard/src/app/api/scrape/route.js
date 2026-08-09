import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { promises as fs } from "fs";
import path from "path";

const POSTS_PER_ACCOUNT = 30;

// Apify actor runs can take a while — allow up to 5 minutes.
export const maxDuration = 300;

// On-disk cache so page loads NEVER burn Apify credits.
// Apify is only called for accounts with no cache, or when the
// client explicitly sends { forceRefresh: true } (Force Sync button).
const CACHE_FILE = path.join(process.cwd(), "data", "scrape-cache.json");

// Run the actor with less memory than the 2 GB default — plenty for
// fetching 30 posts, and it halves the compute units per run.
const ACTOR_MEMORY_MB = 1024;

async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeCache(cache) {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

/**
 * Scrapes the most recent posts for a single Instagram username
 * using the apify/instagram-scraper actor.
 */
async function scrapeAccount(client, username) {
  const run = await client.actor("apify/instagram-scraper").call(
    {
      directUrls: [`https://www.instagram.com/${username}/`],
      resultsType: "posts",
      resultsLimit: POSTS_PER_ACCOUNT,
    },
    { memory: ACTOR_MEMORY_MB }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((post) => ({
    timestamp: post.timestamp ?? null,
    type: post.type ?? null,
    likesCount: post.likesCount ?? 0,
    commentsCount: post.commentsCount ?? 0,
    url: post.url ?? null,
    caption: post.caption ?? "",
    displayUrl: post.displayUrl ?? null,
  }));
}

export async function POST(request) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Server is missing the APIFY_API_TOKEN environment variable." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const usernames = body?.usernames;
  if (
    !Array.isArray(usernames) ||
    usernames.length === 0 ||
    !usernames.every((u) => typeof u === "string" && u.trim().length > 0)
  ) {
    return NextResponse.json(
      {
        error:
          'Request body must include "usernames" as a non-empty array of strings.',
      },
      { status: 400 }
    );
  }

  // Sanitize: trim, strip leading @, dedupe.
  const cleaned = [
    ...new Set(usernames.map((u) => u.trim().replace(/^@/, ""))),
  ];

  const forceRefresh = body?.forceRefresh === true;

  const cache = await readCache();
  const results = {};
  const errors = {};
  const meta = {};

  // Serve cached data unless a force refresh was requested.
  const toScrape = [];
  for (const username of cleaned) {
    const entry = cache[username];
    if (!forceRefresh && entry?.posts) {
      results[username] = entry.posts;
      meta[username] = { fromCache: true, scrapedAt: entry.scrapedAt };
    } else {
      toScrape.push(username);
    }
  }

  if (toScrape.length > 0) {
    const client = new ApifyClient({ token });

    // Scrape accounts sequentially to stay within Apify's concurrent
    // memory limit; one failure never blocks the others.
    for (const username of toScrape) {
      try {
        const posts = await scrapeAccount(client, username);
        const scrapedAt = new Date().toISOString();
        results[username] = posts;
        meta[username] = { fromCache: false, scrapedAt };
        cache[username] = { posts, scrapedAt };
      } catch (err) {
        errors[username] =
          err?.message || "Unknown error while scraping account.";
        // A failed refresh still falls back to stale cache if we have it.
        if (cache[username]?.posts) {
          results[username] = cache[username].posts;
          meta[username] = {
            fromCache: true,
            stale: true,
            scrapedAt: cache[username].scrapedAt,
          };
        }
      }
    }

    await writeCache(cache).catch(() => {});
  }

  const responseBody = { results, meta };
  if (Object.keys(errors).length > 0) {
    responseBody.errors = errors;
  }

  // If every account failed, surface it as a server-side error.
  const allFailed = Object.keys(results).length === 0;
  return NextResponse.json(responseBody, { status: allFailed ? 502 : 200 });
}
