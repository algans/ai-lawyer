import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";

const FormFieldsBodySchema = z.object({
  aciklama: z.string().min(1),
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
  const c = await classify(aciklama);
  const created = await prisma.case.create({
    data: {
      baslik: aciklama.slice(0, 60),
      kategori: c.kategori,
      belgeTipi: c.belgeTipi,
      merci: c.merci,
      eksikBilgiler: c.eksikBilgiler,
    },
  });
  await prisma.message.create({ data: { caseId: created.id, rol: "user", icerik: aciklama } });
  return NextResponse.json({ caseId: created.id, belgeTipi: c.belgeTipi, alanlar: c.eksikBilgiler });
}
