import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { generateDocument } from "@/lib/ai/generator";
import { maskPreview } from "@/lib/preview";
import { caseClassification } from "@/lib/case";
import { oturumCurrentUser } from "@/lib/auth";

const Body = z.object({ caseId: z.string().min(1), ton: z.enum(["resmi", "sert", "uzlasmaci"]).optional() });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek: caseId gerekli." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek: caseId gerekli." }, { status: 400 });
  const { caseId, ton } = parsed.data;

  const kayit = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kayit) return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });

  // Fix 2: Ownership check — reject if case owned by a different user
  if (kayit.userId) {
    const oturum = await oturumCurrentUser(req);
    if (!oturum || oturum.userId !== kayit.userId) {
      return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
    }
  }

  if (!kayit.bilgiTamam) return NextResponse.json({ error: "Bilgiler henüz tamamlanmadı." }, { status: 409 });

  const classification = caseClassification(kayit);
  if (!classification) return NextResponse.json({ error: "Vaka sınıflandırması eksik." }, { status: 409 });

  const history = await prisma.message.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  const toplananBilgi = history.map((m) => `${m.rol}: ${m.icerik}`).join("\n");

  const icerik = await generateDocument({ classification, toplananBilgi, ton });
  const doc = await prisma.document.create({
    data: { caseId, tip: classification.belgeTipi, merci: classification.merci, icerik, durum: "taslak" },
  });
  return NextResponse.json({ documentId: doc.id, onizleme: maskPreview(icerik) });
}
