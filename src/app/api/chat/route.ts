import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";
import { nextQuestion } from "@/lib/ai/collector";

export async function POST(req: NextRequest) {
  const { caseId, mesaj } = await req.json();

  if (!caseId) {
    const classification = await classify(mesaj);
    const c = await prisma.case.create({
      data: { baslik: mesaj.slice(0, 60), kategori: classification.kategori },
    });
    await prisma.message.create({ data: { caseId: c.id, rol: "user", icerik: mesaj } });
    const q = await nextQuestion([{ rol: "user", icerik: mesaj }], classification.eksikBilgiler);
    const cevap = q.soru ?? "Bilgiler tamam, belgenizi oluşturabilirim.";
    await prisma.message.create({ data: { caseId: c.id, rol: "assistant", icerik: cevap } });
    return NextResponse.json({ caseId: c.id, cevap, tamamlandi: q.tamamlandi });
  }

  await prisma.message.create({ data: { caseId, rol: "user", icerik: mesaj } });
  const history = await prisma.message.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  const firstUser = history.find((m) => m.rol === "user")?.icerik ?? mesaj;
  const classification = await classify(firstUser);
  const q = await nextQuestion(
    history.map((m) => ({ rol: m.rol, icerik: m.icerik })),
    classification.eksikBilgiler
  );
  const cevap = q.soru ?? "Bilgiler tamam, belgenizi oluşturabilirim.";
  await prisma.message.create({ data: { caseId, rol: "assistant", icerik: cevap } });
  return NextResponse.json({ caseId, cevap, tamamlandi: q.tamamlandi });
}
