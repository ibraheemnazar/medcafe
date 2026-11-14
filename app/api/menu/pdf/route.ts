import { getLiveMenu } from "@/lib/remote-menu";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const menu = await getLiveMenu();
    return new Response(null, {
      status: 307,
      headers: { Location: menu.url, "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "The menu is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
