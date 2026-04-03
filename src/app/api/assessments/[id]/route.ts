import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET — fetch a single assessment by ID (no auth — shareable links)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("assessments")
    .select("full_result, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
