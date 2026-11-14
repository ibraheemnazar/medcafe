import { getRepositoryMenu } from "@/lib/repository-menu";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const menu = getRepositoryMenu();
  return new Response(null, {
    status: 307,
    headers: {
      Location: new URL(menu.url, request.url).toString(),
      "Cache-Control": "no-store",
    },
  });
}
