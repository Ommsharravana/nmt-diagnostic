import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/commitments/pending?vertical=<name>
// Returns open commitments (status = 'pending' or 'in_progress') for a vertical,
// oldest first. Used by the retake flow to close the accountability loop
// before the respondent answers the assessment again.
// No auth required — matches POST /api/commitments and the RLS policy
// ("Anyone can read commitments").
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical");

  if (!vertical || vertical.trim().length === 0) {
    return NextResponse.json(
      { error: "vertical query parameter is required" },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("commitments")
    .select("*")
    .eq("vertical_name", vertical)
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
