/**
 * Session cookie: a signed JWT (HS256) holding nothing but an expiry.
 * There is exactly one user, so "has a valid cookie" == "is logged in".
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hisab_session";
export const SESSION_DAYS = 30;

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set (at least 16 characters).");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
