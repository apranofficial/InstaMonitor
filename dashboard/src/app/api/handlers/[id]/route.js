import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Handler from "@/models/Handler";

const USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

/** GET /api/handlers/[id] */
export async function GET(_request, { params }) {
  const { id } = await params;
  try {
    await connectDB();
    const handler = await Handler.findById(id).lean();
    if (!handler) {
      return NextResponse.json({ error: "Handler not found." }, { status: 404 });
    }
    return NextResponse.json({ handler });
  } catch (err) {
    console.error("Failed to fetch handler:", err);
    return NextResponse.json({ error: "Failed to fetch handler." }, { status: 500 });
  }
}

/** PUT /api/handlers/[id] — Update handler */
export async function PUT(request, { params }) {
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Build update object from provided fields only.
  const update = {};
  const errors = {};

  if (body.handlerName !== undefined) {
    const name = typeof body.handlerName === "string" ? body.handlerName.trim() : "";
    if (!name) errors.handlerName = "Handler name cannot be empty.";
    else update.handlerName = name;
  }

  if (body.phone !== undefined) {
    const phone = typeof body.phone === "string" ? body.phone.replace(/[\s-]/g, "") : "";
    if (!/^\d{10,15}$/.test(phone)) errors.phone = "Phone must be 10-15 digits.";
    else update.phone = phone;
  }

  if (body.countryCode !== undefined) {
    update.countryCode = typeof body.countryCode === "string" ? body.countryCode.trim() : "+91";
  }

  if (body.accounts !== undefined) {
    const accounts = Array.isArray(body.accounts)
      ? body.accounts.map((a) => (typeof a === "string" ? a.trim().replace(/^@/, "").toLowerCase() : ""))
      : [];
    const nonEmpty = accounts.filter(Boolean);

    if (nonEmpty.length === 0) {
      errors.accounts = "At least one account is required.";
    } else if (nonEmpty.some((a) => !USERNAME_REGEX.test(a))) {
      errors.accounts = "Invalid username format.";
    } else if (new Set(nonEmpty).size !== nonEmpty.length) {
      errors.accounts = "Duplicate usernames.";
    } else {
      update.accounts = nonEmpty;
    }
  }

  if (body.monthlyPay !== undefined) {
    const pay = Number(body.monthlyPay);
    if (!Number.isFinite(pay) || pay <= 0) errors.monthlyPay = "Must be a positive number.";
    else update.monthlyPay = pay;
  }

  if (body.currency !== undefined) {
    update.currency = body.currency === "$" ? "$" : "₹";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed.", errors }, { status: 400 });
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  try {
    await connectDB();
    const handler = await Handler.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!handler) {
      return NextResponse.json({ error: "Handler not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, handler });
  } catch (err) {
    console.error("Failed to update handler:", err);
    return NextResponse.json({ error: "Failed to update handler." }, { status: 500 });
  }
}

/** DELETE /api/handlers/[id] */
export async function DELETE(_request, { params }) {
  const { id } = await params;
  try {
    await connectDB();
    const handler = await Handler.findByIdAndDelete(id).lean();
    if (!handler) {
      return NextResponse.json({ error: "Handler not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: handler });
  } catch (err) {
    console.error("Failed to delete handler:", err);
    return NextResponse.json({ error: "Failed to delete handler." }, { status: 500 });
  }
}
