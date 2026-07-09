import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { dogrulaParolaSabitZaman, oturumTokeni, COOKIE_ADI } from "@/lib/auth";
import { rateLimit, istekAnahtari } from "@/lib/ratelimit";

const Body = z.object({ email: z.string().email(), parola: z.string().min(1) });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "E-posta ve parola gerekli." }, { status: 400 });
  const { email, parola } = parsed.data;

  // Brute-force / credential-stuffing koruması: IP başına 10 deneme / 15 dk.
  if (!rateLimit(`login:${istekAnahtari(req)}`, 10, 900).izin) {
    return NextResponse.json({ error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // bcrypt HER durumda (kullanıcı yoksa dummy hash ile) önce çalışsın → sabit zaman.
  const gecerli = await dogrulaParolaSabitZaman(parola, user?.parolaHash);
  if (!user || !gecerli) {
    return NextResponse.json({ error: "E-posta veya parola hatalı." }, { status: 401 });
  }
  // Token'ı bir kez üret; hem httpOnly cookie'ye (web) hem yanıt gövdesine (mobil SecureStore) koy.
  const token = await oturumTokeni(user.id);
  const res = NextResponse.json({ userId: user.id, token });
  res.cookies.set(COOKIE_ADI, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
