import { get, put, list } from "@vercel/blob";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Local storage is for development and single-server installs with a persistent disk.
// Vercel must always use Blob: its function filesystem is ephemeral.
export function storageMode(): "blob" | "local" {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (
    !process.env.VERCEL &&
    (process.env.NODE_ENV !== "production" || process.env.LOCAL_STORAGE_DIR)
  )
    return "local";
  throw new Error(
    "Connect a private Vercel Blob store before using the admin panel.",
  );
}

function localPath(key: string) {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes(".."))
    throw new Error("Invalid storage path");
  // These are runtime files, never inputs to the deployment bundle.
  return path.join(
    /* turbopackIgnore: true */ process.env.LOCAL_STORAGE_DIR ||
      path.join(process.cwd(), ".data"),
    key,
  );
}

export async function readStored(key: string): Promise<Buffer | null> {
  if (storageMode() === "local") {
    try {
      return await readFile(/* turbopackIgnore: true */ localPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  const result = await get(key, { access: "private", useCache: false });
  if (!result) return null;
  if (result.statusCode !== 200) throw new Error("Could not read stored file");
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function writeStored(
  key: string,
  data: Buffer | string,
  contentType = "application/json",
) {
  if (storageMode() === "local") {
    const target = localPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, data, { mode: 0o600 });
    await rename(temporary, target);
    return;
  }
  await put(key, data, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: key === "menus/current.json",
    cacheControlMaxAge: 60,
  });
}

export async function readJson<T>(key: string): Promise<T | null> {
  const bytes = await readStored(key);
  return bytes ? (JSON.parse(bytes.toString("utf8")) as T) : null;
}

export async function countEntries(
  prefix: string,
  limit: number,
): Promise<number> {
  if (storageMode() === "local") {
    try {
      return (await readdir(/* turbopackIgnore: true */ localPath(prefix)))
        .length;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
      throw error;
    }
  }
  const result = await list({ prefix, limit });
  return result.hasMore ? limit + 1 : result.blobs.length;
}
