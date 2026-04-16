import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// GET — list all dimensions (admin password required)
export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("dimensions")
    .select("*")
    .order("dim_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST — create a new dimension (admin password required)
export async function POST(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // --- Input validation ---
    const errors: string[] = [];

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      errors.push("name must be a non-empty string");
    } else if (body.name.length > 200) {
      errors.push("name must be at most 200 characters");
    }

    if (typeof body.shortName !== "string" || body.shortName.trim().length === 0) {
      errors.push("shortName must be a non-empty string");
    } else if (body.shortName.length > 50) {
      errors.push("shortName must be at most 50 characters");
    }

    if (
      typeof body.dimIndex !== "number" ||
      !Number.isInteger(body.dimIndex) ||
      body.dimIndex < 0 ||
      body.dimIndex > 20
    ) {
      errors.push("dimIndex must be an integer between 0 and 20");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 422 });
    }

    const row = {
      dim_index: body.dimIndex,
      name: body.name,
      short_name: body.shortName,
      sort_order: body.dimIndex,
      archived: false,
    };

    const { data, error } = await supabase
      .from("dimensions")
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
