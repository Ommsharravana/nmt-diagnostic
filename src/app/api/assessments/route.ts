import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST — save a new assessment (no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // --- Input validation ---
    const errors: string[] = [];

    if (typeof body.verticalName !== "string" || body.verticalName.trim().length === 0) {
      errors.push("verticalName must be a non-empty string");
    } else if (body.verticalName.length > 100) {
      errors.push("verticalName must be at most 100 characters");
    }

    if (typeof body.totalScore !== "number" || body.totalScore < 0 || body.totalScore > 175) {
      errors.push("totalScore must be a number between 0 and 175");
    }

    if (typeof body.percentage !== "number" || body.percentage < 0 || body.percentage > 100) {
      errors.push("percentage must be a number between 0 and 100");
    }

    if (!body.maturity || ![1, 2, 3, 4, 5].includes(body.maturity.level)) {
      errors.push("maturity.level must be 1, 2, 3, 4, or 5");
    }

    if (!Array.isArray(body.dimensions)) {
      errors.push("dimensions must be an array");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 422 });
    }

    const row = {
      vertical_name: body.verticalName,
      region: body.region || null,
      respondent_name: body.respondentName || null,
      total_score: body.totalScore,
      max_score: body.maxScore,
      percentage: body.percentage,
      maturity_level: body.maturity.level,
      maturity_state: body.maturity.state,
      dimension_scores: body.dimensions.map(
        (d: { dimension: { name: string; shortName: string }; score: number; maxScore: number; percentage: number; health: string }) => ({
          name: d.dimension.name,
          shortName: d.dimension.shortName,
          score: d.score,
          maxScore: d.maxScore,
          percentage: d.percentage,
          health: d.health,
        })
      ),
      full_result: body,
    };

    const { data, error } = await supabase
      .from("assessments")
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

// GET — list assessments with filters (admin password required)
export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical");
  const region = searchParams.get("region");
  const maturityLevel = searchParams.get("maturity_level");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  let query = supabase
    .from("assessments")
    .select(
      "id, vertical_name, region, respondent_name, total_score, percentage, maturity_level, maturity_state, dimension_scores, created_at"
    )
    .order("created_at", { ascending: false });

  if (vertical) query = query.eq("vertical_name", vertical);
  if (region) query = query.eq("region", region);
  if (maturityLevel) query = query.eq("maturity_level", parseInt(maturityLevel));
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
