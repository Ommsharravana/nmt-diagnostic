import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST — save a new commitment (no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // --- Input validation ---
    const errors: string[] = [];

    if (typeof body.assessmentId !== "string" || body.assessmentId.trim().length === 0) {
      errors.push("assessmentId must be a non-empty string");
    }

    if (typeof body.verticalName !== "string" || body.verticalName.trim().length === 0) {
      errors.push("verticalName must be a non-empty string");
    } else if (body.verticalName.length > 100) {
      errors.push("verticalName must be at most 100 characters");
    }

    if (typeof body.focusDimension !== "string" || body.focusDimension.trim().length === 0) {
      errors.push("focusDimension must be a non-empty string");
    } else if (body.focusDimension.length > 200) {
      errors.push("focusDimension must be at most 200 characters");
    }

    if (
      typeof body.focusDimensionScore !== "number" ||
      body.focusDimensionScore < 0 ||
      body.focusDimensionScore > 25
    ) {
      errors.push("focusDimensionScore must be a number between 0 and 25");
    }

    if (
      typeof body.currentLevel !== "number" ||
      ![1, 2, 3, 4, 5].includes(body.currentLevel)
    ) {
      errors.push("currentLevel must be 1, 2, 3, 4, or 5");
    }

    if (
      typeof body.targetLevel !== "number" ||
      ![1, 2, 3, 4, 5].includes(body.targetLevel)
    ) {
      errors.push("targetLevel must be 1, 2, 3, 4, or 5");
    }

    if (!Array.isArray(body.actionItems) || body.actionItems.length !== 3) {
      errors.push("actionItems must be an array of exactly 3 items");
    } else {
      for (let i = 0; i < body.actionItems.length; i++) {
        const item = body.actionItems[i];
        if (typeof item !== "string" || item.trim().length === 0) {
          errors.push(`actionItems[${i}] must be a non-empty string`);
        } else if (item.length > 500) {
          errors.push(`actionItems[${i}] must be at most 500 characters`);
        }
      }
    }

    if (
      body.targetMeeting !== null &&
      body.targetMeeting !== undefined &&
      (typeof body.targetMeeting !== "string" || body.targetMeeting.length > 200)
    ) {
      errors.push("targetMeeting must be a string of at most 200 characters");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 422 });
    }

    const row = {
      assessment_id: body.assessmentId,
      vertical_name: body.verticalName,
      region: body.region || null,
      respondent_name: body.respondentName || null,
      focus_dimension: body.focusDimension,
      focus_dimension_score: body.focusDimensionScore,
      current_level: body.currentLevel,
      target_level: body.targetLevel,
      action_items: body.actionItems,
      target_meeting: body.targetMeeting || null,
      target_date: body.targetDate || null,
    };

    const { data, error } = await supabase
      .from("commitments")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// GET — list commitments with filters (admin password required)
export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical");
  const status = searchParams.get("status");
  const targetMeeting = searchParams.get("target_meeting");
  const assessmentId = searchParams.get("assessment_id");

  let query = supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: false });

  if (vertical) query = query.eq("vertical_name", vertical);
  if (status) query = query.eq("status", status);
  if (targetMeeting) query = query.eq("target_meeting", targetMeeting);
  if (assessmentId) query = query.eq("assessment_id", assessmentId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
