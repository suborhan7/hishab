/**
 * Screenshot (proof) storage.
 * - With BLOB_READ_WRITE_TOKEN: Vercel Blob (private by default).
 * - Without it (local dev): files under ./public/uploads.
 * Screenshots are always served through /api/proof so they stay behind login.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const access = () => (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";
const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");

const extFor = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");

/** Saves the image and returns a storage key to put in transactions.screenshot. */
export async function saveScreenshot(data: Buffer, mimeType: string): Promise<string> {
  const name = `${new Date().toISOString().slice(0, 10)}-${randomUUID()}.${extFor(mimeType)}`;
  if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`proofs/${name}`, data, {
      access: access(),
      contentType: mimeType,
      addRandomSuffix: false,
    });
    return blob.url;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), data);
  return `local:${name}`;
}

export async function readScreenshot(key: string): Promise<{ body: ReadableStream | Buffer; type: string } | null> {
  if (key.startsWith("local:")) {
    const name = path.basename(key.slice(6));
    try {
      const body = await readFile(path.join(LOCAL_DIR, name));
      const type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
      return { body, type };
    } catch {
      return null;
    }
  }
  const { get } = await import("@vercel/blob");
  const res = await get(key, { access: access() });
  if (!res || !res.stream) return null;
  return { body: res.stream, type: res.blob.contentType ?? "image/jpeg" };
}

export async function deleteScreenshot(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    if (key.startsWith("local:")) {
      await unlink(path.join(LOCAL_DIR, path.basename(key.slice(6))));
    } else {
      const { del } = await import("@vercel/blob");
      await del(key);
    }
  } catch {
    // Missing proof files are not worth failing a delete over.
  }
}

