import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "handlers.json");

const USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

function validate(body) {
  const errors = {};

  if (!body || typeof body !== "object") {
    return { valid: false, errors: { form: "Invalid request body." } };
  }

  const name = typeof body.handlerName === "string" ? body.handlerName.trim() : "";
  if (!name) {
    errors.handlerName = "Handler name is required.";
  }

  const countryCode = typeof body.countryCode === "string" ? body.countryCode.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.replace(/[\s-]/g, "") : "";
  if (!/^\d{10,15}$/.test(phone)) {
    errors.phone = "Phone number must be 10-15 digits.";
  }

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

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      handlerName: name,
      countryCode: countryCode || "+91",
      phone,
      accounts: nonEmpty,
      monthlyPay,
      currency,
    },
  };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { valid, errors, data } = validate(body);
  if (!valid) {
    return NextResponse.json({ error: "Validation failed.", errors }, { status: 400 });
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    let handlers = [];
    try {
      const existing = await fs.readFile(DATA_FILE, "utf-8");
      handlers = JSON.parse(existing);
      if (!Array.isArray(handlers)) handlers = [];
    } catch {
      // File doesn't exist yet or is corrupt — start fresh
      handlers = [];
    }

    const submission = {
      id: `handler_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...data,
      submittedAt: new Date().toISOString(),
    };

    handlers.push(submission);
    await fs.writeFile(DATA_FILE, JSON.stringify(handlers, null, 2), "utf-8");

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
  } catch (err) {
    console.error("Failed to save registration:", err);
    return NextResponse.json(
      { error: "Failed to save your registration. Please try again." },
      { status: 500 }
    );
  }
}
