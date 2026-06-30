import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";

export async function POST(req: NextRequest) {
  const { aciklama } = await req.json();
  const c = await classify(aciklama);
  const created = await prisma.case.create({
    data: { baslik: aciklama.slice(0, 60), kategori: c.kategori },
  });
  await prisma.message.create({ data: { caseId: created.id, rol: "user", icerik: aciklama } });
  return NextResponse.json({ caseId: created.id, belgeTipi: c.belgeTipi, alanlar: c.eksikBilgiler });
}
