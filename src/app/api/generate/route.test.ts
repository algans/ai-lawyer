import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules BEFORE imports — vi.mock is hoisted to top of file by Vitest.
// All vi.fn() calls must live inside the factory to avoid hoisting errors.
vi.mock("@/lib/db", () => ({
  default: {
    message: {
      findMany: vi.fn().mockResolvedValue([{ rol: "user", icerik: "telefon bozuk" }]),
    },
    document: {
      create: vi.fn().mockResolvedValue({ id: "d1" }),
    },
  },
}));
vi.mock("@/lib/ai/classifier", () => ({
  classify: vi.fn().mockResolvedValue({
    kategori: "tuketici",
    belgeTipi: "THH",
    merci: "İlçe THH",
    eksikBilgiler: [],
  }),
}));
vi.mock("@/lib/ai/generator", () => ({
  generateDocument: vi
    .fn()
    .mockResolvedValue(
      "GİZLİ BAŞLIK\n\nGizli tam belge metni burada.\n\nİkinci paragraf: bu da gizli."
    ),
}));
vi.mock("@/lib/preview", () => ({
  maskPreview: vi.fn((text: string) => {
    // Real implementation: first paragraph unmasked, rest masked with █
    const paras = text.split("\n\n");
    if (paras.length <= 1) return text.slice(0, 200);
    const masked = paras.slice(1).map((p: string) => p.replace(/\S/g, "█"));
    return [paras[0], ...masked].join("\n\n");
  }),
}));

import { POST } from "./route";
import prisma from "@/lib/db";
import { generateDocument } from "@/lib/ai/generator";

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      { rol: "user", icerik: "telefon bozuk" } as any,
    ]);
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "d1" } as any);
    vi.mocked(generateDocument).mockResolvedValue(
      "GİZLİ BAŞLIK\n\nGizli tam belge metni burada.\n\nİkinci paragraf: bu da gizli."
    );
  });

  it("saves full doc but returns only masked preview (original brief assertion)", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(body.documentId).toBe("d1");
    // Original brief assertion: full text must NOT appear in onizleme
    expect(body.onizleme).not.toContain("Gizli tam belge metni");
  });

  it("[SECURITY] onizleme does NOT contain any words from later paragraphs", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    // The first paragraph heading should be present (unmasked)
    expect(body.onizleme).toContain("GİZLİ BAŞLIK");

    // Words from later paragraphs must be absent from the preview
    expect(body.onizleme).not.toContain("Gizli tam belge metni burada");
    expect(body.onizleme).not.toContain("İkinci paragraf");
    expect(body.onizleme).not.toContain("bu da gizli");

    // The full document text itself is never in the response
    expect(JSON.stringify(body)).not.toContain("İkinci paragraf: bu da gizli.");
  });

  it("[PERSISTENCE] document.create is called with durum:taslak and full icerik", async () => {
    const fullText =
      "GİZLİ BAŞLIK\n\nGizli tam belge metni burada.\n\nİkinci paragraf: bu da gizli.";
    vi.mocked(generateDocument).mockResolvedValueOnce(fullText);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    await POST(req as any);

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          durum: "taslak",
          icerik: fullText,
          caseId: "c1",
          tip: "THH",
          merci: "İlçe THH",
        }),
      })
    );
  });

  it("[404] returns 404 and does NOT call generateDocument or document.create when no messages", async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValueOnce([] as any);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "nonexistent" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBeTruthy();
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("response body never contains the full icerik string", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const rawBody = await res.text();

    // The full second-paragraph secret text must not leak into the JSON response at all
    expect(rawBody).not.toContain("Gizli tam belge metni burada");
    expect(rawBody).not.toContain("İkinci paragraf: bu da gizli");
  });
});
