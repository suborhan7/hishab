/**
 * POST /api/extract — multipart form with `image`.
 * Stores the screenshot as proof, asks Gemini to read it and returns the
 * extracted fields plus any existing transactions with the same TrxID.
 * Nothing is written to the database here.
 */
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { findByTrxId } from "@/lib/data";
import { GeminiNotConfigured, extractFromScreenshot, type Extracted } from "@/lib/gemini";
import { saveScreenshot } from "@/lib/storage";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !ALLOWED.includes(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());

  let screenshot: string | null = null;
  try {
    screenshot = await saveScreenshot(bytes, file.type);
  } catch (e) {
    console.error("saveScreenshot failed", e);
  }

  let extracted: Extracted | null = null;
  let error: "no_gemini" | "read_failed" | null = null;
  try {
    extracted = await extractFromScreenshot(bytes, file.type);
  } catch (e) {
    if (e instanceof GeminiNotConfigured) error = "no_gemini";
    else {
      console.error("Gemini extraction failed", e);
      error = "read_failed";
    }
  }

  const duplicates = extracted?.trxId ? await findByTrxId(extracted.trxId) : [];
  return NextResponse.json({ screenshot, extracted, duplicates, error });
}
