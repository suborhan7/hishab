/**
 * Data-access guard. Every server action and route handler calls
 * `requireAuth()` — the proxy redirect is only a convenience, not the
 * security boundary.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSessionToken } from "./session";

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) redirect("/login");
}
