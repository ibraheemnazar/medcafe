import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 100;

export async function validatePdf(bytes) {
  if (!bytes.length || bytes.length > MAX_PDF_BYTES)
    throw new Error("The menu PDF must be smaller than 20 MB.");
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-")
    throw new Error("content/menu.pdf is not a PDF.");
  let pages;
  try {
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    pages = document.getPageCount();
  } catch {
    throw new Error(
      "The menu PDF is invalid or password-protected. Export a new, unencrypted PDF.",
    );
  }
  if (pages < 1 || pages > MAX_PDF_PAGES)
    throw new Error("The menu PDF must contain 1 to 100 pages.");
  return {
    pages,
    size: bytes.length,
    id: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function prepareMenu(root = process.cwd()) {
  const source = path.join(root, "content", "menu.pdf");
  const names = await readdir(path.dirname(source));
  const otherPdfs = names.filter(
    (name) => name.toLowerCase().endsWith(".pdf") && name !== "menu.pdf",
  );
  if (otherPdfs.length)
    throw new Error(
      "Name the replacement file exactly menu.pdf and remove other PDFs from content/. The previous live menu will stay online.",
    );
  let bytes;
  try {
    bytes = await readFile(source);
  } catch {
    throw new Error(
      "Missing content/menu.pdf. Upload a PDF named menu.pdf to the content folder.",
    );
  }
  const info = await validatePdf(bytes);
  const assetDirectory = path.join(root, "public", "menu");
  const generatedDirectory = path.join(root, "generated");
  const filename = `${info.id}.pdf`;
  const manifest = { ...info, filename: "menu.pdf", url: `/menu/${filename}` };
  // Only build-generated files live here. Never remove source menu history.
  await rm(assetDirectory, { recursive: true, force: true });
  await mkdir(assetDirectory, { recursive: true });
  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(path.join(assetDirectory, filename), bytes);
  await writeFile(
    path.join(generatedDirectory, "menu.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = await prepareMenu();
    console.log(
      `Menu ready: ${result.pages} pages, ${(result.size / 1024 / 1024).toFixed(2)} MB, revision ${result.id.slice(0, 12)}`,
    );
  } catch (error) {
    console.error(`MENU UPDATE REJECTED: ${error.message}`);
    process.exitCode = 1;
  }
}
