import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// GET — list all questions (admin password required)
export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("dimension_index", { ascending: true })
    .order("question_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST — create a new question (admin password required)
export async function POST(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const errors: string[] = [];

    if (
      typeof body.dimensionIndex !== "number" ||
      !Number.isInteger(body.dimensionIndex) ||
      body.dimensionIndex < 0 ||
      body.dimensionIndex > 20
    ) {
      errors.push("dimensionIndex must be an integer between 0 and 20");
    }

    if (typeof body.text !== "string" || body.text.trim().length === 0) {
      errors.push("text must be a non-empty string");
    }

    if (body.selected !== undefined && typeof body.selected !== "boolean") {
      errors.push("selected must be a boolean");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 422 });
    }

    // Determine next question_number for this dimension
    const { data: existing, error: fetchError } = await supabase
      .from("questions")
      .select("question_number")
      .eq("dimension_index", body.dimensionIndex)
      .order("question_number", { ascending: false })
      .limit(1);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const nextNumber =
      existing && existing.length > 0 ? existing[0].question_number + 1 : 0;

    const id = `d${body.dimensionIndex}_q${nextNumber}`;

    const row = {
      id,
      dimension_index: body.dimensionIndex,
      question_number: nextNumber,
      text: body.text,
      selected: body.selected ?? false,
      sort_order: nextNumber,
      archived: false,
    };

    const { data, error } = await supabase
      .from("questions")
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
