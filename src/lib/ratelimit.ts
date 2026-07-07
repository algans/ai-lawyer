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

// X-Forwarded-For istemci kontrollüdür; güvenilen bir ters proxy (ör. Caddy) arkasında
// gerçek istemci IP'sini header'ın SONUNA ekler. GUVENILEN_PROXY_SAYISI kadar sondan
// gerideki IP güvenilirdir. Proxy yoksa (0/tanımsız) header güvenilmezdir; yine de
// tüm header yerine tek IP'ye normalize ederek best-effort anahtar üretiriz.
function istemciIp(req: NextRequest): string {
  const ipler = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ipler.length === 0) return "anon";
  const proxySayisi = Number(process.env.GUVENILEN_PROXY_SAYISI ?? 0);
  if (proxySayisi > 0) {
    return ipler[ipler.length - proxySayisi] ?? ipler[ipler.length - 1];
  }
  return ipler[0];
}

export function istekAnahtari(req: NextRequest, userId?: string): string {
  if (userId) return `u:${userId}`;
  return `ip:${istemciIp(req)}`;
}
