import { NextResponse } from "next/server";
import {
  authConfig,
  createSession,
  errorResponse,
  HttpError,
  recordLoginAttempt,
  requireSameOrigin,
  SESSION_SECONDS,
  sessionCookieName,
  verifyCredentials,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    authConfig();
    if (Number(request.headers.get("content-length")) > 4096)
      throw new HttpError(400, "Invalid sign-in request.");
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Invalid sign-in request.");
    }
    if (
      typeof body.username !== "string" ||
      typeof body.password !== "string" ||
      body.username.length > 100 ||
      body.password.length > 256
    )
      throw new HttpError(400, "Enter a valid username and password.");
    await recordLoginAttempt(request);
    if (!(await verifyCredentials(body.username, body.password)))
      throw new HttpError(401, "Incorrect username or password.");
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(sessionCookieName(), createSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
