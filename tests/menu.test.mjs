import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  prepareMenu,
  validatePdf,
  MAX_PDF_BYTES,
} from "../scripts/prepare-menu.mjs";

async function pdf(pages = 1) {
  const doc = await PDFDocument.create();
  for (let n = 0; n < pages; n++) doc.addPage();
  return Buffer.from(await doc.save({ addDefaultPage: false }));
}

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), "medcafe-menu-"));
  await mkdir(path.join(root, "content"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("accepts a valid multi-page PDF and produces an identical versioned asset", async () => {
  await fixture(async (root) => {
    const bytes = await pdf(3);
    await writeFile(path.join(root, "content/menu.pdf"), bytes);
    const manifest = await prepareMenu(root);
    assert.equal(manifest.pages, 3);
    assert.equal(manifest.filename, "menu.pdf");
    assert.match(manifest.url, /^\/menu\/[a-f0-9]{64}\.pdf$/);
    assert.deepEqual(
      await readFile(path.join(root, "public", manifest.url)),
      bytes,
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(root, "generated/menu.json"))),
      manifest,
    );
    assert.equal((await prepareMenu(root)).id, manifest.id);
  });
});

test("changed PDF bytes change the URL, preventing stale cached menus", async () => {
  await fixture(async (root) => {
    await writeFile(path.join(root, "content/menu.pdf"), await pdf(1));
    const first = await prepareMenu(root);
    await writeFile(path.join(root, "content/menu.pdf"), await pdf(2));
    const second = await prepareMenu(root);
    assert.notEqual(first.url, second.url);
    assert.equal(second.pages, 2);
  });
});

test("rejects non-PDF, malformed, empty, oversized, and excessive-page documents", async () => {
  await assert.rejects(
    validatePdf(Buffer.from("<html>fake PDF</html>")),
    /not a PDF/,
  );
  await assert.rejects(
    validatePdf(Buffer.from("%PDF-1.7\ncorrupt file")),
    /invalid/,
  );
  await assert.rejects(validatePdf(Buffer.alloc(0)), /smaller than/);
  await assert.rejects(
    validatePdf(Buffer.alloc(MAX_PDF_BYTES + 1)),
    /smaller than/,
  );
  await assert.rejects(validatePdf(await pdf(0)), /1 to 100/);
  await assert.rejects(validatePdf(await pdf(101)), /1 to 100/);
});

test("invalid replacements fail before changing the generated live menu", async () => {
  await fixture(async (root) => {
    const bytes = await pdf(1);
    await writeFile(path.join(root, "content/menu.pdf"), bytes);
    const first = await prepareMenu(root);
    await writeFile(path.join(root, "content/menu.pdf"), "not a PDF");
    await assert.rejects(prepareMenu(root), /not a PDF/);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(root, "generated/menu.json"))),
      first,
    );
    assert.deepEqual(
      await readFile(path.join(root, "public", first.url)),
      bytes,
    );
  });
});

test("catches wrong filenames instead of silently deploying the previous PDF", async () => {
  await fixture(async (root) => {
    await assert.rejects(prepareMenu(root), /Missing content\/menu.pdf/);
    await writeFile(path.join(root, "content/menu.pdf"), await pdf());
    await writeFile(path.join(root, "content/replacement.pdf"), await pdf());
    await assert.rejects(prepareMenu(root), /exactly menu.pdf/);
  });
});

test("the initial PDF preserves the nine pages served by the existing menu", async () => {
  const info = await validatePdf(
    await readFile(new URL("../content/menu.pdf", import.meta.url)),
  );
  assert.equal(info.pages, 9);
  assert.ok(info.size <= MAX_PDF_BYTES);
});
