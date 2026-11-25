/** GET /api/proof?key=… — streams a stored proof screenshot (login required). */
import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/lib/auth";
import { readScreenshot } from "@/lib/storage";

export async function GET(request: NextRequest) {
  if (!(await isAuthed())) return new NextResponse("unauthorized", { status: 401 });
  const key = request.nextUrl.searchParams.get("key");
  if (!key) return new NextResponse("missing key", { status: 400 });
  try {
    const file = await readScreenshot(key);
    if (!file) return new NextResponse("not found", { status: 404 });
    return new NextResponse(file.body as BodyInit, {
      headers: { "Content-Type": file.type, "Cache-Control": "private, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
