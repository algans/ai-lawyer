import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";
import { nextQuestion } from "@/lib/ai/collector";
import { oturumCurrentUser } from "@/lib/auth";
import { rateLimit, istekAnahtari } from "@/lib/ratelimit";

const ChatBodySchema = z.object({
  mesaj: z.string().min(1),
  // İlk mesajda tarayıcı caseId'yi null gönderir (henüz vaka yok) — null'u da kabul et.
  caseId: z.string().nullish(),
});

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek: mesaj gerekli." }, { status: 400 });
  }
  const parsed = ChatBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek: mesaj gerekli." }, { status: 400 });
  }
  const { caseId, mesaj } = parsed.data;

  // Rate limiting (chat stays anonymous-friendly — auth is optional, only used for limit tier)
  const oturum = await oturumCurrentUser(req);
  const chatLimit = oturum ? 400 : 40;
  if (!rateLimit(istekAnahtari(req, oturum?.userId), chatLimit, 86400).izin) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  if (!caseId) {
    const classification = await classify(mesaj);
    if (!classification) {
      return NextResponse.json({
        caseId: null,
        cevap:
          "Merhaba! Ben hukuki belge asistanınızım. Size doğru belgeyi hazırlayabilmem için yaşadığınız sorunu kısaca anlatır mısınız? Örneğin: \"İnternetten aldığım ürün arızalı çıktı, satıcı iade etmiyor.\"",
        tamamlandi: false,
      });
    }
    const bilgiTamam = classification.eksikBilgiler.length === 0;
    const c = await prisma.case.create({
      data: {
        baslik: mesaj.slice(0, 60),
        kategori: classification.kategori,
        belgeTipi: classification.belgeTipi,
        merci: classification.merci,
        eksikBilgiler: classification.eksikBilgiler,
        bilgiTamam,
        // Oturum açık kullanıcının vakası baştan ona bağlansın; anonim kalırsa
        // sahiplenme ödeme adımında (payment/init) yapılır.
        userId: oturum?.userId,
      },
    });
    await prisma.message.create({ data: { caseId: c.id, rol: "user", icerik: mesaj } });
    const q = bilgiTamam
      ? { soru: null, tamamlandi: true }
      : await nextQuestion([{ rol: "user", icerik: mesaj }], classification.eksikBilgiler);
    const cevap = q.soru ?? "Bilgiler tamam, belgenizi oluşturabilirim.";
    await prisma.message.create({ data: { caseId: c.id, rol: "assistant", icerik: cevap } });
    return NextResponse.json({ caseId: c.id, cevap, tamamlandi: q.tamamlandi });
  }

  // Sahiplik kapısı: mesajı YAZMADAN ÖNCE vakayı doğrula (generate/form-fields ile
  // aynı desen). Başkasının vakasına mesaj eklemeyi (IDOR) engeller.
  const kayit = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kayit) return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
  if (kayit.userId && (!oturum || oturum.userId !== kayit.userId)) {
    return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
  }
  await prisma.message.create({ data: { caseId, rol: "user", icerik: mesaj } });
  const history = await prisma.message.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  const q = await nextQuestion(
    history.map((m) => ({ rol: m.rol, icerik: m.icerik })),
    kayit.eksikBilgiler
  );
  if (q.tamamlandi && !kayit.bilgiTamam) {
    await prisma.case.update({ where: { id: caseId }, data: { bilgiTamam: true } });
  }
  const cevap = q.soru ?? "Bilgiler tamam, belgenizi oluşturabilirim.";
  await prisma.message.create({ data: { caseId, rol: "assistant", icerik: cevap } });
  return NextResponse.json({ caseId, cevap, tamamlandi: q.tamamlandi });
}
