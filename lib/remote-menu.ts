import type { PublicMenu } from "./menu-types";

// Public service address only. All credentials remain on the hosting server.
export const MENU_SERVICE_ORIGIN = "https://medcafe.srv2124063.hstgr.cloud";

export async function getLiveMenu(): Promise<PublicMenu> {
  const response = await fetch(`${MENU_SERVICE_ORIGIN}/api/menu`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Menu service unavailable");
  const data = await response.json();
  const id = data?.menu?.id;
  if (
    data?.kind !== "pdf" ||
    typeof id !== "string" ||
    !/^[a-f0-9]{64}$/.test(id) ||
    data.url !== `${MENU_SERVICE_ORIGIN}/menu/${id}.pdf`
  ) {
    throw new Error("Invalid menu response");
  }
  return data as PublicMenu;
}
