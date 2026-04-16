import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

const VALID_CATEGORIES = ["project", "stakeholder", "initiative", "other", "custom"] as const;

// GET — list all vertical overrides (admin password required)
export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("vertical_overrides")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST — create a new vertical override (admin password required)
export async function POST(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const errors: string[] = [];

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      errors.push("name must be a non-empty string");
    } else if (body.name.length > 200) {
      errors.push("name must be at most 200 characters");
    }

    if (
      typeof body.category !== "string" ||
      !VALID_CATEGORIES.includes(body.category as (typeof VALID_CATEGORIES)[number])
    ) {
      errors.push(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    if (
      body.sortOrder !== undefined &&
      (typeof body.sortOrder !== "number" || !Number.isInteger(body.sortOrder))
    ) {
      errors.push("sortOrder must be an integer");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 422 });
    }

    const row = {
      name: body.name,
      category: body.category,
      sort_order: body.sortOrder ?? 0,
      archived: false,
    };

    const { data, error } = await supabase
      .from("vertical_overrides")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
