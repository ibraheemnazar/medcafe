import { randomUUID } from "node:crypto";
import { head } from "@vercel/blob";
import {
  errorResponse,
  HttpError,
  requireAdmin,
  requireSameOrigin,
} from "@/lib/auth";
import {
  getCurrentMenu,
  publishPdf,
  uploadPathIsValid,
  validatePdf,
} from "@/lib/menu";
import { MAX_PDF_BYTES, publicMenu } from "@/lib/menu-types";
import { storageMode, writeStored } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    await requireAdmin();
    return Response.json(
      { menu: publicMenu(await getCurrentMenu()), storage: storageMode() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireAdmin();
    let pathname: string, filename: string;
    if (storageMode() === "local") {
      if (Number(request.headers.get("content-length")) > MAX_PDF_BYTES + 65536)
        throw new HttpError(400, "Choose a PDF smaller than 20 MB.");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        throw new HttpError(400, "Choose a PDF to upload.");
      if (file.size > MAX_PDF_BYTES)
        throw new HttpError(400, "Choose a PDF smaller than 20 MB.");
      const bytes = Buffer.from(await file.arrayBuffer());
      await validatePdf(bytes);
      pathname = `menus/uploads/${randomUUID()}.pdf`;
      filename = file.name;
      await writeStored(pathname, bytes, "application/pdf");
    } else {
      if (Number(request.headers.get("content-length")) > 4096)
        throw new HttpError(400, "Invalid upload.");
      const body = await request.json();
      if (
        typeof body.pathname !== "string" ||
        !uploadPathIsValid(body.pathname) ||
        typeof body.filename !== "string"
      )
        throw new HttpError(400, "Invalid upload.");
      pathname = body.pathname;
      filename = body.filename;
      const blob = await head(pathname);
      if (blob.size > MAX_PDF_BYTES || blob.contentType !== "application/pdf")
        throw new HttpError(400, "Choose a PDF smaller than 20 MB.");
    }
    const menu = await publishPdf(pathname, filename);
    return Response.json(
      { menu: publicMenu(menu) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
