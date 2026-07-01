import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id }, include: { case: true } });

  if (!doc || doc.case.userId !== oturum.userId)
    return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });

  if (doc.durum !== "odendi")
    return NextResponse.json({ error: "Belge için ödeme gerekli." }, { status: 402 });

  return NextResponse.json({ icerik: doc.icerik, tip: doc.tip, merci: doc.merci });
}
