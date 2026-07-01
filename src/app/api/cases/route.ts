import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  const cases = (
    await prisma.case.findMany({
      where: { userId: oturum.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, baslik: true, kategori: true, createdAt: true,
        documents: { select: { id: true, tip: true, durum: true, createdAt: true } },
      },
    })
  ).map((c) => ({
    id: c.id,
    baslik: c.baslik,
    kategori: c.kategori,
    createdAt: c.createdAt,
    documents: c.documents.map((d) => ({
      id: d.id,
      tip: d.tip,
      durum: d.durum,
      createdAt: d.createdAt,
    })),
  }));
  return NextResponse.json({ cases });
}
