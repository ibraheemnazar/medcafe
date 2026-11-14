import { getLiveMenu } from "@/lib/remote-menu";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getLiveMenu(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "The menu is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
