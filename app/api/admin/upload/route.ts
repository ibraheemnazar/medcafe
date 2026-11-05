import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  errorResponse,
  HttpError,
  requireAdmin,
  requireSameOrigin,
} from "@/lib/auth";
import { uploadPathIsValid } from "@/lib/menu";
import { MAX_PDF_BYTES } from "@/lib/menu-types";
import { storageMode } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (storageMode() !== "blob")
      throw new HttpError(400, "Direct uploads are not enabled.");
    if (Number(request.headers.get("content-length")) > 16384)
      throw new HttpError(400, "Invalid upload request.");
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        requireSameOrigin(request);
        await requireAdmin();
        if (!uploadPathIsValid(pathname))
          throw new HttpError(400, "Invalid upload path.");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_PDF_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + 5 * 60 * 1000,
        };
      },
      // The provider authenticates this callback. Publishing is a separate,
      // authenticated request after server-side PDF validation.
      onUploadCompleted: async () => {},
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
