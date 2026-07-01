import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { iyzicoProvider } from "@/lib/payment/iyzico";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const base = process.env.APP_URL ?? "";
  if (!token) return NextResponse.redirect(`${base}/hesap?odeme=basarisiz`, 303);

  const { basarili, iyzicoRef, paidPrice, currency } = await iyzicoProvider.callbackDogrula(token);
  const payment = await prisma.payment.findFirst({ where: { iyzicoRef: token } });
  if (!payment) return NextResponse.redirect(`${base}/hesap?odeme=basarisiz`, 303);

  // Fix 4: Idempotency — already processed
  if (payment.durum === "basarili") return NextResponse.redirect(`${base}/hesap?odeme=basarili`, 303);

  // Fix 1: Verify paidPrice and currency match what we expect
  if (basarili && paidPrice === payment.tutar && currency === "TRY") {
    await prisma.payment.update({ where: { id: payment.id }, data: { durum: "basarili", iyzicoRef } });
    await prisma.document.update({ where: { id: payment.documentId }, data: { durum: "odendi" } });
    return NextResponse.redirect(`${base}/hesap?odeme=basarili`, 303);
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { durum: "basarisiz" } });
  return NextResponse.redirect(`${base}/hesap?odeme=basarisiz`, 303);
}
