/**
 * Minimal signed-session auth using Web Crypto (HMAC-SHA256), so it
 * runs both in Node route handlers and in the Edge proxy/middleware.
 *
 * Session token format: base64url(payload).base64url(signature)
 * where payload = JSON { exp: <unix ms> }.
 */

export const SESSION_COOKIE = "im_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Server is missing the AUTH_SECRET environment variable.");
  }
  return secret;
}

function b64url(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Creates a signed session token valid for SESSION_TTL_MS. */
export async function createSessionToken() {
  const payload = new TextEncoder().encode(
    JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })
  );
  const key = await hmacKey();
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, payload));
  return `${b64url(payload)}.${b64url(sig)}`;
}

/** Returns true if the token has a valid signature and hasn't expired. */
export async function verifySessionToken(token) {
  try {
    if (!token || typeof token !== "string") return false;
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return false;

    const payloadBytes = b64urlDecode(payloadB64);
    const sigBytes = b64urlDecode(sigB64);

    const key = await hmacKey();
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
