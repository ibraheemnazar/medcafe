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
  if (
    !Array.isArray(data.pageImages) ||
    data.pageImages.length !== data.menu.pages ||
    data.pageImages.some(
      (page: { url: string; width: number; height: number }, index: number) =>
        page.url !==
          `${MENU_SERVICE_ORIGIN}/menu/${id}/pages/${index + 1}.jpg` ||
        !Number.isInteger(page.width) ||
        !Number.isInteger(page.height) ||
        Math.min(page.width, page.height) < 1 ||
        Math.max(page.width, page.height) > 1600,
    )
  )
    throw new Error("Menu page previews are not ready");
  return data as PublicMenu;
}
