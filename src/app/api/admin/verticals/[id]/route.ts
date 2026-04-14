import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const VALID_CATEGORIES = ["project", "stakeholder", "initiative", "other", "custom"] as const;

// PATCH — update a vertical override (admin password required)
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

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        errors.push("name must be a non-empty string");
      } else if (body.name.length > 200) {
        errors.push("name must be at most 200 characters");
      } else {
        updates.name = body.name;
      }
    }

    if (body.category !== undefined) {
      if (
        typeof body.category !== "string" ||
        !VALID_CATEGORIES.includes(body.category as (typeof VALID_CATEGORIES)[number])
      ) {
        errors.push(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
      } else {
        updates.category = body.category;
      }
    }

    if (body.archived !== undefined) {
      if (typeof body.archived !== "boolean") {
        errors.push("archived must be a boolean");
      } else {
        updates.archived = body.archived;
      }
    }

    if (body.sortOrder !== undefined) {
      if (typeof body.sortOrder !== "number" || !Number.isInteger(body.sortOrder)) {
        errors.push("sortOrder must be an integer");
      } else {
        updates.sort_order = body.sortOrder;
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
      .from("vertical_overrides")
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

// DELETE — delete a vertical override (admin password required)
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
    .from("vertical_overrides")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("vertical_overrides").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
