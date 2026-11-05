import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import {
  authConfig,
  createSession,
  recordLoginAttempt,
  requireSameOrigin,
  verifyCredentials,
  verifySession,
} from "../lib/auth";
import {
  getCurrentMenu,
  publishPdf,
  uploadPathIsValid,
  validatePdf,
} from "../lib/menu";
import { readJson, readStored, storageMode, writeStored } from "../lib/storage";
import type { PublishedMenu } from "../lib/menu-types";

let folder: string;
const originalEnv = { ...process.env };
const password = "only-for-automated-tests";
before(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "medcafe-test-"));
  process.env.LOCAL_STORAGE_DIR = folder;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  process.env.ADMIN_USERNAME = "test-admin";
  const salt = randomBytes(16).toString("hex");
  process.env.ADMIN_PASSWORD_HASH = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
  process.env.SESSION_SECRET = randomBytes(32).toString("hex");
});
after(async () => {
  process.env = originalEnv;
  await rm(folder, { recursive: true, force: true });
});

test("login checks both username and password without accepting defaults", async () => {
  assert.equal(await verifyCredentials("test-admin", password), true);
  assert.equal(await verifyCredentials("admin", password), false);
  assert.equal(await verifyCredentials("test-admin", "wrong"), false);
  const secret = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  assert.throws(authConfig, /setup is incomplete/);
  process.env.SESSION_SECRET = secret;
});

test("signed sessions expire, reject tampering, and invalidate on credential rotation", () => {
  const now = Date.now();
  const token = createSession(now);
  assert.equal(verifySession(token, now + 1000), true);
  assert.equal(verifySession(token, now + 8 * 60 * 60 * 1000 + 1), false);
  assert.equal(verifySession(`${token}x`, now), false);
  assert.equal(verifySession(token.replace(/.$/, "!"), now), false);
  assert.equal(verifySession(undefined, now), false);
  const hash = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
  assert.equal(verifySession(token, now), false);
  process.env.ADMIN_PASSWORD_HASH = hash;
});

test("mutations reject cross-origin and absent-origin requests", () => {
  const url = "https://medcafe-one.vercel.app/api/admin/menu";
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request(url, {
        headers: { origin: "https://medcafe-one.vercel.app" },
      }),
    ),
  );
  assert.throws(
    () =>
      requireSameOrigin(
        new Request(url, { headers: { origin: "https://attacker.example" } }),
      ),
    /not allowed/,
  );
  assert.throws(() => requireSameOrigin(new Request(url)), /not allowed/);
});

test("rate limits persist in storage across requests", async () => {
  const req = new Request("http://localhost/api/admin/login", {
    headers: { "x-forwarded-for": "203.0.113.7" },
  });
  const now = Date.now();
  for (let i = 0; i < 10; i++) await recordLoginAttempt(req, now);
  await assert.rejects(recordLoginAttempt(req, now), /Too many/);
  await assert.rejects(recordLoginAttempt(req, now), /Too many/);
  await assert.doesNotReject(recordLoginAttempt(req, now + 15 * 60 * 1000));
});

test("Vercel fails closed when durable Blob storage is missing", () => {
  process.env.VERCEL = "1";
  assert.throws(storageMode, /private Vercel Blob/);
  delete process.env.VERCEL;
});

test("PDF validation rejects disguised, malformed, empty and oversized documents", async () => {
  await assert.rejects(
    validatePdf(Buffer.from("<html>not a PDF</html>")),
    /not a PDF/,
  );
  await assert.rejects(
    validatePdf(Buffer.from("%PDF-1.7\nthis is corrupt")),
    /cannot be opened/,
  );
  await assert.rejects(
    validatePdf(new Uint8Array(20 * 1024 * 1024 + 1)),
    /smaller than/,
  );
  const document = await PDFDocument.create();
  const empty = await document.save({ addDefaultPage: false });
  await assert.rejects(validatePdf(empty), /1 to 100/);
});

test("publishing updates current PDF, preserves old versions, and a bad upload keeps the live menu", async () => {
  const createPdf = async (pageCount: number) => {
    const pdf = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) pdf.addPage();
    return Buffer.from(await pdf.save());
  };
  assert.equal(await getCurrentMenu(), null);
  const firstPath = `menus/uploads/${randomUUID()}.pdf`;
  await writeStored(firstPath, await createPdf(1), "application/pdf");
  const first = await publishPdf(firstPath, "first.pdf");
  assert.equal(first.pages, 1);
  const secondPath = `menus/uploads/${randomUUID()}.pdf`;
  await writeStored(secondPath, await createPdf(2), "application/pdf");
  const second = await publishPdf(secondPath, "../../second.pdf");
  assert.equal(second.pages, 2);
  assert.equal(second.filename.includes("/"), false);
  assert.equal((await getCurrentMenu())?.id, second.id);
  assert.equal(
    (await readJson<PublishedMenu>(`menus/versions/${first.id}.json`))?.id,
    first.id,
  );
  const invalidPath = `menus/uploads/${randomUUID()}.pdf`;
  await writeStored(invalidPath, Buffer.from("fake PDF"));
  await assert.rejects(publishPdf(invalidPath, "fake.pdf"), /not a PDF/);
  assert.equal((await getCurrentMenu())?.id, second.id);
  assert.equal(uploadPathIsValid("../../secret"), false);
  await assert.rejects(readStored("../../secret"), /Invalid storage path/);
});
