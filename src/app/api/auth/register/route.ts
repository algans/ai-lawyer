import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { hashParola, oturumTokeni, COOKIE_ADI } from "@/lib/auth";

const Body = z.object({ email: z.string().email(), parola: z.string().min(6), ad: z.string().optional() });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Geçerli e-posta ve en az 6 karakter parola gerekli." }, { status: 400 });
  const { email, parola, ad } = parsed.data;

  const mevcut = await prisma.user.findUnique({ where: { email } });
  if (mevcut) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });

  const user = await prisma.user.create({ data: { email, ad, parolaHash: await hashParola(parola) } });
  const res = NextResponse.json({ userId: user.id }, { status: 201 });
  res.cookies.set(COOKIE_ADI, await oturumTokeni(user.id), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
