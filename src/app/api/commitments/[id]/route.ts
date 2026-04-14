import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET — fetch a single commitment by ID (no auth — for follow-up UX)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("commitments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH — update status / completion_notes (admin password required)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    // --- Input validation ---
    const errors: string[] = [];
    const allowedStatuses = ["pending", "in_progress", "done", "missed", "partial"];

    if (body.status !== undefined && !allowedStatuses.includes(body.status)) {
      errors.push(`status must be one of: ${allowedStatuses.join(", ")}`);
    }

    if (body.completion_notes !== undefined) {
      if (typeof body.completion_notes !== "string") {
        errors.push("completion_notes must be a string");
      } else if (body.completion_notes.length > 2000) {
        errors.push("completion_notes must be at most 2000 characters");
      }
    }

    if (body.status === undefined && body.completion_notes === undefined) {
      errors.push("At least one of status or completion_notes must be provided");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 422 });
    }

    const updates: {
      status?: string;
      completion_notes?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updates.status = body.status;
    if (body.completion_notes !== undefined) updates.completion_notes = body.completion_notes;

    const { data, error } = await supabase
      .from("commitments")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Commitment not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
