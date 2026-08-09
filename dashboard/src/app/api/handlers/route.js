import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Handler from "@/models/Handler";

const USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

function validateHandler(body) {
  const errors = {};

  const name = typeof body.handlerName === "string" ? body.handlerName.trim() : "";
  if (!name) errors.handlerName = "Handler name is required.";

  const phone = typeof body.phone === "string" ? body.phone.replace(/[\s-]/g, "") : "";
  if (!/^\d{10,15}$/.test(phone)) errors.phone = "Phone number must be 10-15 digits.";

  const accounts = Array.isArray(body.accounts)
    ? body.accounts.map((a) => (typeof a === "string" ? a.trim().replace(/^@/, "").toLowerCase() : ""))
    : [];
  const nonEmpty = accounts.filter(Boolean);

  if (nonEmpty.length === 0) {
    errors.accounts = "At least one Instagram account is required.";
  } else if (nonEmpty.some((a) => !USERNAME_REGEX.test(a))) {
    errors.accounts = "One or more usernames contain invalid characters.";
  } else if (new Set(nonEmpty).size !== nonEmpty.length) {
    errors.accounts = "Duplicate usernames are not allowed.";
  }

  const monthlyPay = Number(body.monthlyPay);
  if (!Number.isFinite(monthlyPay) || monthlyPay <= 0) {
    errors.monthlyPay = "Monthly pay must be a positive number.";
  }

  const currency = body.currency === "$" ? "$" : "₹";
  const countryCode = typeof body.countryCode === "string" ? body.countryCode.trim() : "+91";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: { handlerName: name, countryCode, phone, accounts: nonEmpty, monthlyPay, currency },
  };
}

/** GET /api/handlers — List all handlers */
export async function GET() {
  try {
    await connectDB();
    const handlers = await Handler.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ handlers });
  } catch (err) {
    console.error("Failed to fetch handlers:", err);
    return NextResponse.json({ error: "Failed to fetch handlers." }, { status: 500 });
  }
}

/** POST /api/handlers — Create a new handler */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { valid, errors, data } = validateHandler(body);
  if (!valid) {
    return NextResponse.json({ error: "Validation failed.", errors }, { status: 400 });
  }

  try {
    await connectDB();
    const handler = await Handler.create(data);
    return NextResponse.json({ success: true, handler }, { status: 201 });
  } catch (err) {
    console.error("Failed to create handler:", err);
    return NextResponse.json({ error: "Failed to save handler." }, { status: 500 });
  }
}
