import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false }, { status: 401 });
}
