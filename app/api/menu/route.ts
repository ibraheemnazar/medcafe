import { errorResponse } from "@/lib/auth";
import { getCurrentMenu } from "@/lib/menu";
import { publicMenu } from "@/lib/menu-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(publicMenu(await getCurrentMenu()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // Keep the existing menu usable before the owner connects storage.
    if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN)
      return Response.json(publicMenu(null), {
        headers: { "Cache-Control": "no-store" },
      });
    return errorResponse(error);
  }
}
