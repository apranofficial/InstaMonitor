import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { connectDB } from "@/lib/db";
import ScrapeCache from "@/models/ScrapeCache";

const POSTS_PER_ACCOUNT = 30;

// Apify actor runs can take a while — allow up to 5 minutes.
export const maxDuration = 300;

// Run the actor with less memory than the 2 GB default — plenty for
// fetching 30 posts, and it halves the compute units per run.
const ACTOR_MEMORY_MB = 1024;

/**
 * Scrapes the most recent posts for a single Instagram username
 * using the apify/instagram-scraper actor.
 */
async function scrapeAccount(client, username) {
  // 1. Fetch Posts
  const runPosts = await client.actor("apify/instagram-scraper").call(
    {
      directUrls: [`https://www.instagram.com/${username}/`],
      resultsType: "posts",
      resultsLimit: POSTS_PER_ACCOUNT,
    },
    { memory: ACTOR_MEMORY_MB }
  );

  const { items: postItems } = await client.dataset(runPosts.defaultDatasetId).listItems();

  const posts = postItems.map((post) => ({
    timestamp: post.timestamp ?? null,
    type: post.type ?? null,
    likesCount: post.likesCount ?? 0,
    commentsCount: post.commentsCount ?? 0,
    url: post.url ?? null,
    caption: post.caption ?? "",
    displayUrl: post.displayUrl ?? null,
    viewsCount: post.videoViewCount ?? post.videoPlayCount ?? post.playCount ?? post.viewCount ?? 0,
  }));

  // 2. Fetch Details for Followers Count
  let followersCount = 0;
  try {
    const runDetails = await client.actor("apify/instagram-scraper").call(
      {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "details",
      },
      { memory: ACTOR_MEMORY_MB }
    );
    const { items: detailsItems } = await client.dataset(runDetails.defaultDatasetId).listItems();
    if (detailsItems && detailsItems.length > 0) {
      followersCount = detailsItems[0].followersCount ?? 0;
    }
  } catch (err) {
    console.error(`Failed to fetch details for ${username}`, err);
  }

  return { posts, followersCount };
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

  await connectDB();

  const results = {};
  const errors = {};
  const meta = {};

  // Serve cached data from MongoDB unless a force refresh was requested.
  const toScrape = [];
  for (const username of cleaned) {
    if (!forceRefresh) {
      const cached = await ScrapeCache.findOne({ username }).lean();
      if (cached?.posts) {
        results[username] = {
          posts: cached.posts,
          followersCount: cached.followersCount,
          statsHistory: cached.statsHistory || [],
        };
        meta[username] = { fromCache: true, scrapedAt: cached.scrapedAt };
        continue;
      }
    }
    toScrape.push(username);
  }

  if (toScrape.length > 0) {
    const client = new ApifyClient({ token });

    // Scrape accounts sequentially to stay within Apify's concurrent
    // memory limit; one failure never blocks the others.
    for (const username of toScrape) {
      try {
        const { posts, followersCount } = await scrapeAccount(client, username);
        const scrapedAt = new Date();
        
        // Push the new followers count to history
        const newHistoryRecord = { date: scrapedAt, followersCount };

        // Upsert into MongoDB cache.
        const updatedCache = await ScrapeCache.findOneAndUpdate(
          { username },
          { 
            posts, 
            followersCount,
            scrapedAt,
            $push: { statsHistory: newHistoryRecord }
          },
          { upsert: true, new: true, lean: true }
        );

        results[username] = {
          posts,
          followersCount,
          statsHistory: updatedCache.statsHistory || [newHistoryRecord]
        };
        meta[username] = { fromCache: false, scrapedAt: scrapedAt.toISOString() };

      } catch (err) {
        errors[username] =
          err?.message || "Unknown error while scraping account.";
        // A failed refresh still falls back to stale cache if we have it.
        const stale = await ScrapeCache.findOne({ username }).lean();
        if (stale?.posts) {
          results[username] = {
            posts: stale.posts,
            followersCount: stale.followersCount,
            statsHistory: stale.statsHistory || [],
          };
          meta[username] = {
            fromCache: true,
            stale: true,
            scrapedAt: stale.scrapedAt,
          };
        }
      }
    }
  }

  const responseBody = { results, meta };
  if (Object.keys(errors).length > 0) {
    responseBody.errors = errors;
  }

  // If every account failed, surface it as a server-side error.
  const allFailed = Object.keys(results).length === 0;
  return NextResponse.json(responseBody, { status: allFailed ? 502 : 200 });
}
