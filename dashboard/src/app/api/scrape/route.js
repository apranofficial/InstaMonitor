import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";

const POSTS_PER_ACCOUNT = 30;

// Apify actor runs can take a while — allow up to 5 minutes.
export const maxDuration = 300;

/**
 * Scrapes the most recent posts for a single Instagram username
 * using the apify/instagram-scraper actor.
 */
async function scrapeAccount(client, username) {
  const run = await client.actor("apify/instagram-scraper").call({
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsType: "posts",
    resultsLimit: POSTS_PER_ACCOUNT,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((post) => ({
    timestamp: post.timestamp ?? null,
    type: post.type ?? null,
    likesCount: post.likesCount ?? 0,
    commentsCount: post.commentsCount ?? 0,
    url: post.url ?? null,
    caption: post.caption ?? "",
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

  const client = new ApifyClient({ token });

  const results = {};
  const errors = {};

  // Scrape all accounts in parallel; one failure never blocks the others.
  const settled = await Promise.allSettled(
    cleaned.map((username) => scrapeAccount(client, username))
  );

  settled.forEach((outcome, i) => {
    const username = cleaned[i];
    if (outcome.status === "fulfilled") {
      results[username] = outcome.value;
    } else {
      errors[username] =
        outcome.reason?.message || "Unknown error while scraping account.";
    }
  });

  const responseBody = { results };
  if (Object.keys(errors).length > 0) {
    responseBody.errors = errors;
  }

  // If every account failed, surface it as a server-side error.
  const allFailed = Object.keys(results).length === 0;
  return NextResponse.json(responseBody, { status: allFailed ? 502 : 200 });
}
