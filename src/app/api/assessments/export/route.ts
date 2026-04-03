import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical");
  const region = searchParams.get("region");

  let query = supabase
    .from("assessments")
    .select(
      "vertical_name, region, respondent_name, total_score, percentage, maturity_level, maturity_state, dimension_scores, created_at"
    )
    .order("created_at", { ascending: false });

  if (vertical) query = query.eq("vertical_name", vertical);
  if (region) query = query.eq("region", region);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build CSV
  const dimHeaders = [
    "Strategic Clarity",
    "Chapter Penetration",
    "Execution",
    "Regional Alignment",
    "Impact Measurement",
    "Brand Visibility",
    "Continuity",
  ];

  const headers = [
    "Vertical",
    "Region",
    "Respondent",
    "Total Score",
    "Percentage",
    "Maturity Level",
    "Maturity State",
    ...dimHeaders,
    "Date",
  ];

  const rows = (data || []).map((row) => {
    const dimScores = (row.dimension_scores as { score: number }[]) || [];
    return [
      row.vertical_name,
      row.region || "",
      row.respondent_name || "",
      row.total_score,
      row.percentage,
      row.maturity_level,
      row.maturity_state,
      ...dimScores.map((d) => d.score),
      new Date(row.created_at).toLocaleDateString("en-IN"),
    ];
  });

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="nmt-diagnostics-export.csv"`,
    },
  });
}
