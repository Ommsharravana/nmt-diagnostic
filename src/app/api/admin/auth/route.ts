import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let password: string | undefined;
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : undefined;
  } catch {
    return NextResponse.json(
      { valid: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (password === process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false }, { status: 401 });
}
