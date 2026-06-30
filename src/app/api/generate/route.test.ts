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
      "GÖRÜNÜR BAŞLIK\n\nGizli birinci paragraf metni.\n\nGizli ikinci paragraf metni."
    ),
}));

import { POST } from "./route";
import prisma from "@/lib/db";
import { generateDocument } from "@/lib/ai/generator";
import { classify } from "@/lib/ai/classifier";

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      { rol: "user", icerik: "telefon bozuk" } as any,
    ]);
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "d1" } as any);
    vi.mocked(generateDocument).mockResolvedValue(
      "GÖRÜNÜR BAŞLIK\n\nGizli birinci paragraf metni.\n\nGizli ikinci paragraf metni."
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
    expect(body.onizleme).not.toContain("Gizli birinci paragraf metni");
  });

  it("[SECURITY] onizleme does NOT contain any words from later paragraphs", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    // The first paragraph heading should be present (unmasked) — real maskPreview leaves it visible
    expect(body.onizleme).toContain("GÖRÜNÜR BAŞLIK");

    // Words from later paragraphs must be absent — real maskPreview replaces \S with █
    expect(body.onizleme).not.toContain("Gizli birinci paragraf metni");
    expect(body.onizleme).not.toContain("Gizli ikinci");

    // The mask character █ must be present — proves real masking happened
    expect(body.onizleme).toContain("█");

    // The full document text itself is never in the response
    expect(JSON.stringify(body)).not.toContain("Gizli ikinci paragraf metni.");
  });

  it("[PERSISTENCE] document.create is called with durum:taslak and full icerik", async () => {
    const fullText =
      "GÖRÜNÜR BAŞLIK\n\nGizli birinci paragraf metni.\n\nGizli ikinci paragraf metni.";
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
    expect(rawBody).not.toContain("Gizli birinci paragraf metni");
    expect(rawBody).not.toContain("Gizli ikinci paragraf metni");
  });

  it("[400] missing caseId returns 400 and does not call generateDocument or document.create", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ ton: "resmi" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Geçersiz istek: caseId gerekli.");
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
    expect(classify).not.toHaveBeenCalled();
  });

  it("[400] non-JSON body returns 400 and does not call generateDocument or document.create", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Geçersiz istek: caseId gerekli.");
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });
});
