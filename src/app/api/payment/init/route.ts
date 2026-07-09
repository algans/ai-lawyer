import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";
import { getSaglayici, type Saglayici } from "@/lib/payment";
import { BELGE_FIYATI } from "@/lib/pricing";

const Body = z.object({
  documentId: z.string().min(1),
  saglayici: z.enum(["iyzico", "stripe"]).optional(),
});

export async function POST(req: NextRequest) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "documentId gerekli." }, { status: 400 });

  const doc = await prisma.document.findUnique({ where: { id: parsed.data.documentId }, include: { case: true } });
  if (!doc) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  if (doc.case.userId && doc.case.userId !== oturum.userId) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  if (!doc.case.userId) await prisma.case.updateMany({ where: { id: doc.caseId, userId: null }, data: { userId: oturum.userId } });

  const saglayici: Saglayici = parsed.data.saglayici ?? "iyzico";
  const user = await prisma.user.findUnique({ where: { id: oturum.userId } });
  const { paymentPageUrl, token } = await getSaglayici(saglayici).checkoutBaslat({
    documentId: doc.id,
    tutar: BELGE_FIYATI,
    conversationId: doc.id,
    callbackUrl: `${process.env.APP_URL}/api/payment/callback`,
    buyerEmail: user?.email ?? "musteri@example.com",
    buyerId: oturum.userId,
  });
  await prisma.payment.create({
    data: { userId: oturum.userId, documentId: doc.id, tutar: BELGE_FIYATI, durum: "bekliyor", saglayici, iyzicoRef: token },
  });
  return NextResponse.json({ paymentPageUrl });
}
