export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 100;

export type PublicMenu = {
  kind: "pdf";
  menu: { id: string; filename: string; size: number; pages: number };
  url: string;
  pageImages: { url: string; width: number; height: number }[];
};
