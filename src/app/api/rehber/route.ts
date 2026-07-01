import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";
import { callClaude, MODELS } from "@/lib/ai/client";
import { REHBER_SYSTEM, rehberUser } from "@/lib/ai/prompts/rehber";

export async function POST(req: NextRequest) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });

  let body: { documentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { documentId } = body;
  if (!documentId) return NextResponse.json({ error: "documentId gerekli." }, { status: 400 });

  const doc = await prisma.document.findUnique({ where: { id: documentId }, include: { case: true } });

  if (!doc || doc.case.userId !== oturum.userId)
    return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });

  if (doc.durum !== "odendi")
    return NextResponse.json({ error: "Belge için ödeme gerekli." }, { status: 402 });

  const rehber = await callClaude({
    model: MODELS.fast,
    system: REHBER_SYSTEM,
    user: rehberUser(doc.tip, doc.merci ?? ""),
  });

  return NextResponse.json({ rehber });
}
