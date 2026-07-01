import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { dogrulaParola, oturumTokeni, COOKIE_ADI } from "@/lib/auth";

const Body = z.object({ email: z.string().email(), parola: z.string().min(1) });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "E-posta ve parola gerekli." }, { status: 400 });
  const { email, parola } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.parolaHash || !(await dogrulaParola(parola, user.parolaHash))) {
    return NextResponse.json({ error: "E-posta veya parola hatalı." }, { status: 401 });
  }
  const res = NextResponse.json({ userId: user.id });
  res.cookies.set(COOKIE_ADI, await oturumTokeni(user.id), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
