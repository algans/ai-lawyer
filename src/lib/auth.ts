import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export const COOKIE_ADI = "oturum";

// Fail-fast: SESSION_SECRET tanımsız/kısa ise boş anahtarla imzalanan token
// taklit edilebilir olur. Modül üst seviyesinde DEĞİL, çağrı anında doğrula
// (üst seviye throw `next build`'i kırar — iyzico dersi).
const MIN_SECRET_UZUNLUK = 32;
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < MIN_SECRET_UZUNLUK) {
    throw new Error(
      `SESSION_SECRET ortam değişkeni en az ${MIN_SECRET_UZUNLUK} karakter olmalı (güvenli oturum imzalama için).`
    );
  }
  return new TextEncoder().encode(s);
};

export const hashParola = (p: string) => bcrypt.hash(p, 10);
export const dogrulaParola = (p: string, hash: string) => bcrypt.compare(p, hash);

// Sabit-zamanlı doğrulama: kullanıcı bulunamasa bile bir bcrypt karşılaştırması
// çalıştırıp yanıt süresini eşitler → e-posta varlığının timing ile sızmasını engeller.
const SABIT_ZAMAN_DUMMY_HASH = bcrypt.hashSync("sabit-zaman-dummy", 10);
export async function dogrulaParolaSabitZaman(parola: string, hash?: string | null): Promise<boolean> {
  const eslesme = await dogrulaParola(parola, hash ?? SABIT_ZAMAN_DUMMY_HASH);
  return hash != null && eslesme;
}

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
  // Web: httpOnly cookie. Mobil: cookie taşıyamaz → Authorization: Bearer <jwt>.
  const cookieToken = req.cookies.get(COOKIE_ADI)?.value;
  if (cookieToken) {
    const oturum = await oturumDogrula(cookieToken);
    if (oturum) return oturum;
  }
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  return oturumDogrula(bearer);
}
