import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Handler from "@/models/Handler";

/**
 * GET /api/accounts
 * Returns a flat, deduplicated list of every Instagram username
 * across all registered handlers. Used by the dashboard to know
 * which accounts to scrape.
 */
export async function GET() {
  try {
    await connectDB();
    const handlers = await Handler.find().select("accounts").lean();

    const uniqueAccounts = [
      ...new Set(handlers.flatMap((h) => h.accounts)),
    ].sort();

    return NextResponse.json({ accounts: uniqueAccounts });
  } catch (err) {
    console.error("Failed to fetch accounts:", err);
    return NextResponse.json(
      { error: "Failed to fetch accounts." },
      { status: 500 }
    );
  }
}
