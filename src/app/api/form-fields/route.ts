import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";
import { oturumCurrentUser } from "@/lib/auth";
import { rateLimit, istekAnahtari } from "@/lib/ratelimit";

const FormFieldsBodySchema = z.object({
  aciklama: z.string().min(1),
});

const FormSubmitBodySchema = z.object({
  caseId: z.string().min(1),
  degerler: z.record(z.string(), z.string()),
});

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek: açıklama gerekli." }, { status: 400 });
  }
  const parsed = FormFieldsBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek: açıklama gerekli." }, { status: 400 });
  }
  const { aciklama } = parsed.data;

  // Maliyet-DoS koruması: ücretli classify çağrısından ÖNCE rate-limit.
  const oturum = await oturumCurrentUser(req);
  const limit = oturum ? 100 : 20;
  if (!rateLimit(`formfields:${istekAnahtari(req, oturum?.userId)}`, limit, 86400).izin) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  const c = await classify(aciklama);
  if (!c) {
    return NextResponse.json(
      { error: "Açıklamanızdan hukuki bir sorun tespit edemedik. Lütfen yaşadığınız olayı biraz daha ayrıntılı anlatın." },
      { status: 422 }
    );
  }
  const created = await prisma.case.create({
    data: {
      baslik: aciklama.slice(0, 60),
      kategori: c.kategori,
      belgeTipi: c.belgeTipi,
      merci: c.merci,
      eksikBilgiler: c.eksikBilgiler,
      // Oturum açık kullanıcının vakası baştan ona bağlansın; anonim kalırsa
      // sahiplenme ödeme adımında (payment/init) yapılır.
      userId: oturum?.userId,
    },
  });
  await prisma.message.create({ data: { caseId: created.id, rol: "user", icerik: aciklama } });
  return NextResponse.json({ caseId: created.id, belgeTipi: c.belgeTipi, alanlar: c.eksikBilgiler });
}

// Form akışında tamamlanma kararı deterministiktir: alanları classifier belirledi,
// kullanıcı hepsini doldurduysa bilgi tamamdır — chat akışındaki AI collector'a sorulmaz.
export async function PUT(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek: caseId ve alan değerleri gerekli." }, { status: 400 });
  }
  const parsed = FormSubmitBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek: caseId ve alan değerleri gerekli." }, { status: 400 });
  }
  const { caseId, degerler } = parsed.data;

  const kayit = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kayit) return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
  if (kayit.userId) {
    const oturum = await oturumCurrentUser(req);
    if (!oturum || oturum.userId !== kayit.userId) {
      return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
    }
  }

  const bosAlanlar = kayit.eksikBilgiler.filter((alan) => !degerler[alan]?.trim());
  if (bosAlanlar.length > 0) {
    return NextResponse.json(
      { error: `Lütfen şu alanları doldurun: ${bosAlanlar.join(", ")}` },
      { status: 422 }
    );
  }

  const ozet = kayit.eksikBilgiler.map((alan) => `${alan}: ${degerler[alan].trim()}`).join("\n");
  await prisma.message.create({ data: { caseId, rol: "user", icerik: ozet } });
  await prisma.case.update({ where: { id: caseId }, data: { bilgiTamam: true } });
  return NextResponse.json({ tamamlandi: true });
}
