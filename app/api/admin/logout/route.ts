import { NextResponse } from "next/server";
import {
  errorResponse,
  requireSameOrigin,
  sessionCookieName,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(sessionCookieName(), "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
