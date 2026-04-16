import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// PATCH — update a question (admin password required)
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

    const errors: string[] = [];
    const updates: Record<string, unknown> = {};

    if (body.text !== undefined) {
      if (typeof body.text !== "string" || body.text.trim().length === 0) {
        errors.push("text must be a non-empty string");
      } else {
        updates.text = body.text;
      }
    }

    if (body.selected !== undefined) {
      if (typeof body.selected !== "boolean") {
        errors.push("selected must be a boolean");
      } else {
        updates.selected = body.selected;
      }
    }

    if (body.archived !== undefined) {
      if (typeof body.archived !== "boolean") {
        errors.push("archived must be a boolean");
      } else {
        updates.archived = body.archived;
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 422 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 422 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE — delete a question (admin password required)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing, error: findError } = await supabase
    .from("questions")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("questions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
