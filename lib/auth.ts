import {
  createHash,
  createHmac,
  randomUUID,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { countEntries, storageMode, writeStored } from "./storage";

const scrypt = promisify(nodeScrypt);
export const SESSION_SECONDS = 8 * 60 * 60;
export const sessionCookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-medcafe-session"
    : "medcafe-session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function authConfig() {
  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.SESSION_SECRET;
  if (
    !username ||
    !passwordHash ||
    !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash) ||
    !secret ||
    secret.length < 32
  ) {
    throw new HttpError(
      503,
      "Admin setup is incomplete. Configure the admin credentials and session secret.",
    );
  }
  return { username, passwordHash, secret };
}

function equal(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export async function verifyCredentials(username: string, password: string) {
  const config = authConfig();
  const [, salt, expected] = config.passwordHash.split("$");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return (
    timingSafeEqual(actual, Buffer.from(expected, "hex")) &&
    equal(username, config.username)
  );
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSession(now = Date.now()) {
  const { username, passwordHash, secret } = authConfig();
  const payload = Buffer.from(
    JSON.stringify({
      username,
      expires: now + SESSION_SECONDS * 1000,
      version: sign(passwordHash, secret),
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySession(
  token: string | undefined,
  now = Date.now(),
): boolean {
  if (!token || token.length > 2048) return false;
  try {
    const { username, passwordHash, secret } = authConfig();
    const parts = token.split(".");
    if (parts.length !== 2 || !equal(sign(parts[0], secret), parts[1]))
      return false;
    const payload = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    );
    return (
      payload.username === username &&
      typeof payload.expires === "number" &&
      payload.expires > now &&
      payload.expires <= now + SESSION_SECONDS * 1000 &&
      equal(payload.version, sign(passwordHash, secret))
    );
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  authConfig();
  const jar = await cookies();
  if (!verifySession(jar.get(sessionCookieName())?.value))
    throw new HttpError(401, "Your session has expired. Please sign in again.");
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(request.url).origin;
  const configured = process.env.APP_ORIGIN
    ? new URL(process.env.APP_ORIGIN).origin
    : null;
  if (!origin || (origin !== expected && origin !== configured))
    throw new HttpError(403, "This request is not allowed.");
}

// Persist attempts in the shared store, rather than an in-memory serverless counter.
// A fixed 15-minute window permits at most 10 attempts per source IP per window.
export async function recordLoginAttempt(request: Request, now = Date.now()) {
  const { secret } = authConfig();
  storageMode();
  const ip =
    request.headers
      .get(process.env.VERCEL ? "x-vercel-forwarded-for" : "x-forwarded-for")
      ?.split(",")[0]
      ?.trim() || "unknown";
  const bucket = Math.floor(now / (15 * 60 * 1000));
  const key = createHmac("sha256", secret)
    .update(`${bucket}:${ip}`)
    .digest("hex");
  const prefix = `security/login/${bucket}/${key}/`;
  if ((await countEntries(prefix, 10)) >= 10)
    throw new HttpError(
      429,
      "Too many sign-in attempts. Please try again in 15 minutes.",
    );
  await writeStored(`${prefix}${randomUUID()}.json`, "{}");
  if ((await countEntries(prefix, 10)) > 10)
    throw new HttpError(
      429,
      "Too many sign-in attempts. Please try again in 15 minutes.",
    );
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          ...(error.status === 429 ? { "Retry-After": "900" } : {}),
        },
      },
    );
  // Never expose provider errors, storage paths, or credentials to the browser.
  console.error(
    "Med Cafe request failed:",
    error instanceof Error ? error.name : "Unknown error",
  );
  return Response.json(
    { error: "The service is temporarily unavailable. Please try again." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
