"use server";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken } from "@/lib/session";

export type LoginState = { error?: "wrong" | "notConfigured" };

const sha = (s: string) => createHash("sha256").update(s).digest();

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !process.env.SESSION_SECRET) return { error: "notConfigured" };

  const given = String(formData.get("password") ?? "");
  // Compare hashes so the comparison is constant-time regardless of length.
  if (!timingSafeEqual(sha(given), sha(expected))) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return { error: "wrong" };
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
