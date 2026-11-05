export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 100;
export const ORIGINAL_MENU_IMAGES = Array.from(
  { length: 9 },
  (_, i) => `/menu-${i + 1}.png`,
);

export type PublishedMenu = {
  id: string;
  filename: string;
  pathname: string;
  size: number;
  pages: number;
  updatedAt: string;
};

export type PublicMenu =
  | { kind: "images"; images: string[] }
  | { kind: "pdf"; menu: Omit<PublishedMenu, "pathname">; url: string };

export function publicMenu(menu: PublishedMenu | null): PublicMenu {
  if (!menu) return { kind: "images", images: ORIGINAL_MENU_IMAGES };
  const details = {
    id: menu.id,
    filename: menu.filename,
    size: menu.size,
    pages: menu.pages,
    updatedAt: menu.updatedAt,
  };
  return {
    kind: "pdf",
    menu: details,
    url: `/api/menu/pdf?version=${menu.id}`,
  };
}
