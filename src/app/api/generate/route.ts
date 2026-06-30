import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";
import { generateDocument } from "@/lib/ai/generator";
import { maskPreview } from "@/lib/preview";

export async function POST(req: NextRequest) {
  const { caseId, ton } = await req.json();
  const history = await prisma.message.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  if (history.length === 0) {
    return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
  }
  const toplananBilgi = history.map((m) => `${m.rol}: ${m.icerik}`).join("\n");
  const firstUser = history.find((m) => m.rol === "user")?.icerik ?? "";
  const classification = await classify(firstUser);

  const icerik = await generateDocument({ classification, toplananBilgi, ton });
  const doc = await prisma.document.create({
    data: { caseId, tip: classification.belgeTipi, merci: classification.merci, icerik, durum: "taslak" },
  });
  return NextResponse.json({ documentId: doc.id, onizleme: maskPreview(icerik) });
}
