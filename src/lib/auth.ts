import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export const COOKIE_ADI = "oturum";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export const hashParola = (p: string) => bcrypt.hash(p, 10);
export const dogrulaParola = (p: string, hash: string) => bcrypt.compare(p, hash);

export async function oturumTokeni(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function oturumDogrula(token?: string): Promise<{ userId: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}

export async function oturumCurrentUser(req: NextRequest): Promise<{ userId: string } | null> {
  return oturumDogrula(req.cookies.get(COOKIE_ADI)?.value);
}
