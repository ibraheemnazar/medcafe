import manifest from "@/generated/menu.json";
import type { PublicMenu } from "./menu-types";

export const GITHUB_REPOSITORY_URL = "https://github.com/ibraheemnazar/medcafe";
export const GITHUB_UPLOAD_URL = `${GITHUB_REPOSITORY_URL}/upload/main/content`;
export const GITHUB_HISTORY_URL = `${GITHUB_REPOSITORY_URL}/commits/main/content/menu.pdf`;

export function getRepositoryMenu(): PublicMenu {
  return {
    kind: "pdf",
    menu: {
      id: manifest.id,
      filename: manifest.filename,
      size: manifest.size,
      pages: manifest.pages,
    },
    url: manifest.url,
  };
}
