import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";
import { belgeyiPdf } from "@/lib/export/pdf";
import { belgeyiDocx } from "@/lib/export/docx";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") === "docx" ? "docx" : "pdf";
  const doc = await prisma.document.findUnique({ where: { id }, include: { case: true } });
  if (!doc || doc.case.userId !== oturum.userId) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  if (doc.durum !== "odendi") return NextResponse.json({ error: "Belge için ödeme gerekli." }, { status: 402 });

  const [buf, mime, ext] = format === "docx"
    ? [await belgeyiDocx(doc.icerik), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"]
    : [await belgeyiPdf(doc.icerik), "application/pdf", "pdf"];
  return new NextResponse(buf as any, {
    headers: { "Content-Type": mime as string, "Content-Disposition": `attachment; filename="belge-${id}.${ext}"` },
  });
}
