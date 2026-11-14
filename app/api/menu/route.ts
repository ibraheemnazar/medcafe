import { getRepositoryMenu } from "@/lib/repository-menu";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getRepositoryMenu(), {
    headers: { "Cache-Control": "no-store" },
  });
}
