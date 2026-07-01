import type { NextRequest } from "next/server";
const kova = new Map<string, { sayac: number; sifirAt: number }>();

export function rateLimit(anahtar: string, limit: number, pencereSaniye: number): { izin: boolean; kalan: number } {
  const simdi = Date.now();
  const kayit = kova.get(anahtar);
  if (!kayit || simdi > kayit.sifirAt) {
    kova.set(anahtar, { sayac: 1, sifirAt: simdi + pencereSaniye * 1000 });
    return { izin: true, kalan: limit - 1 };
  }
  if (kayit.sayac >= limit) return { izin: false, kalan: 0 };
  kayit.sayac += 1;
  return { izin: true, kalan: limit - kayit.sayac };
}

export function istekAnahtari(req: NextRequest, userId?: string): string {
  if (userId) return `u:${userId}`;
  return `ip:${req.headers.get("x-forwarded-for") ?? "anon"}`;
}
