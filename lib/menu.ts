import { PDFDocument } from "pdf-lib";
import { randomUUID } from "node:crypto";
import { HttpError } from "./auth";
import { MAX_PDF_BYTES, MAX_PDF_PAGES, type PublishedMenu } from "./menu-types";
import { readJson, readStored, writeStored } from "./storage";

export const getCurrentMenu = () =>
  readJson<PublishedMenu>("menus/current.json");
export const uploadPathIsValid = (pathname: string) =>
  /^menus\/uploads\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.pdf$/.test(
    pathname,
  );
export const versionIsValid = (version: string) =>
  /^[a-f0-9-]{36}$/.test(version);

export async function validatePdf(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_PDF_BYTES)
    throw new HttpError(400, "Choose a PDF smaller than 20 MB.");
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-")
    throw new HttpError(400, "This file is not a PDF.");
  try {
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    const pages = document.getPageCount();
    if (pages < 1 || pages > MAX_PDF_PAGES)
      throw new HttpError(
        400,
        `Choose a PDF with 1 to ${MAX_PDF_PAGES} pages.`,
      );
    return pages;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      400,
      "This PDF cannot be opened. Use a valid PDF without password protection.",
    );
  }
}

export function cleanFilename(filename: string) {
  return (
    filename
      .replace(/[\x00-\x1f\x7f/\\]/g, "")
      .trim()
      .slice(0, 150) || "menu.pdf"
  );
}

export async function publishPdf(pathname: string, filename: string) {
  if (!uploadPathIsValid(pathname)) throw new HttpError(400, "Invalid upload.");
  const bytes = await readStored(pathname);
  if (!bytes)
    throw new HttpError(
      400,
      "The uploaded file was not found. Please upload it again.",
    );
  const pages = await validatePdf(bytes);
  const menu: PublishedMenu = {
    id: randomUUID(),
    pathname,
    filename: cleanFilename(filename),
    size: bytes.length,
    pages,
    updatedAt: new Date().toISOString(),
  };
  // Write the immutable version first. A failed upload never changes the live menu.
  await writeStored(`menus/versions/${menu.id}.json`, JSON.stringify(menu));
  await writeStored("menus/current.json", JSON.stringify(menu));
  return menu;
}
