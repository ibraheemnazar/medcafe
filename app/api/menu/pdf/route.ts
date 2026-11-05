import { errorResponse, HttpError } from "@/lib/auth";
import { getCurrentMenu, versionIsValid } from "@/lib/menu";
import type { PublishedMenu } from "@/lib/menu-types";
import { readJson, readStored } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const version = new URL(request.url).searchParams.get("version");
    if (version && !versionIsValid(version))
      throw new HttpError(404, "Menu not found.");
    const menu = version
      ? await readJson<PublishedMenu>(`menus/versions/${version}.json`)
      : await getCurrentMenu();
    if (!menu) throw new HttpError(404, "No PDF menu has been published yet.");
    const bytes = await readStored(menu.pathname);
    if (!bytes) throw new HttpError(404, "Menu not found.");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename="menu.pdf"; filename*=UTF-8''${encodeURIComponent(menu.filename).replace(/'/g, "%27")}`,
        "Cache-Control": version
          ? "public, max-age=31536000, immutable"
          : "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
