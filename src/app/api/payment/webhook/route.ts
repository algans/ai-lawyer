import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { stripeProvider, type StripeDogrulama } from "@/lib/payment/stripe";
import { PARA_BIRIMI } from "@/lib/pricing";

// Stripe webhook. iyzico'nun /api/payment/callback'inden tamamen ayrı; paywall
// kontrolü burada bağımsız bir kopya olarak uygulanır (spec: "ayrı kopya").
export async function POST(req: NextRequest) {
  // İmza HAM gövdeyle doğrulanır — req.json() ile parse ETME, yoksa imza tutmaz.
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let sonuc: StripeDogrulama;
  try {
    sonuc = stripeProvider.webhookDogrula(rawBody, sig);
  } catch {
    return NextResponse.json({ error: "gecersiz imza" }, { status: 400 });
  }

  // İlgilenmediğimiz olay (ref yok) — Stripe'a 200 dön ki tekrar denemesin.
  if (!sonuc.ref) return NextResponse.json({ received: true }, { status: 200 });

  const payment = await prisma.payment.findFirst({ where: { iyzicoRef: sonuc.ref } });
  if (!payment) return NextResponse.json({ received: true }, { status: 200 });

  // Idempotency — zaten işlenmiş.
  if (payment.durum === "basarili") return NextResponse.json({ received: true }, { status: 200 });

  // Paywall invariant: yalnızca doğrulanmış ödeme + tutar/para birimi eşleşiyorsa aç.
  if (sonuc.basarili && sonuc.paidPrice === payment.tutar && sonuc.currency === PARA_BIRIMI) {
    await prisma.payment.update({ where: { id: payment.id }, data: { durum: "basarili", iyzicoRef: sonuc.ref } });
    await prisma.document.update({ where: { id: payment.documentId }, data: { durum: "odendi" } });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { durum: "basarisiz" } });
  return NextResponse.json({ received: true }, { status: 200 });
}
