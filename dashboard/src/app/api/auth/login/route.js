import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth";

// Constant-time string comparison to avoid timing attacks.
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) {
    // Still burn comparable time on mismatched lengths.
    let dummy = 0;
    for (let i = 0; i < ab.length; i++) dummy |= ab[i];
    return false;
  }
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

export async function POST(request) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected || !process.env.AUTH_SECRET) {
    return NextResponse.json(
      {
        error:
          "Server is missing DASHBOARD_PASSWORD or AUTH_SECRET environment variables.",
      },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const password = typeof body?.password === "string" ? body.password : "";
  if (!safeEqual(password, expected)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
