import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// GET — list all region overrides (admin password required)
export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("region_overrides")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST — create a new region override (admin password required)
export async function POST(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const errors: string[] = [];

    if (typeof body.code !== "string" || body.code.trim().length === 0) {
      errors.push("code must be a non-empty string");
    } else if (body.code.length > 20) {
      errors.push("code must be at most 20 characters");
    }

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      errors.push("name must be a non-empty string");
    } else if (body.name.length > 200) {
      errors.push("name must be at most 200 characters");
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
      code: body.code,
      name: body.name,
      sort_order: body.sortOrder ?? 0,
      archived: false,
    };

    const { data, error } = await supabase
      .from("region_overrides")
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
