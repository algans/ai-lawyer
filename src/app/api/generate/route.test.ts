import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules BEFORE imports — vi.mock is hoisted to top of file by Vitest.
const { oturumCurrentUser } = vi.hoisted(() => ({
  oturumCurrentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", () => ({ oturumCurrentUser }));

vi.mock("@/lib/db", () => ({
  default: {
    case: {
      findUnique: vi.fn().mockResolvedValue({
        id: "c1",
        kategori: "tuketici",
        belgeTipi: "THH",
        merci: "İlçe THH",
        eksikBilgiler: [],
        bilgiTamam: true,
      }),
    },
    message: {
      findMany: vi.fn().mockResolvedValue([{ rol: "user", icerik: "telefon bozuk" }]),
    },
    document: {
      create: vi.fn().mockResolvedValue({ id: "d1" }),
    },
  },
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

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    oturumCurrentUser.mockResolvedValue(null);
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      id: "c1",
      kategori: "tuketici",
      belgeTipi: "THH",
      merci: "İlçe THH",
      eksikBilgiler: [],
      bilgiTamam: true,
    } as any);
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

  it("[404] returns 404 and does NOT call generateDocument or document.create when case not found", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValueOnce(null);

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

  it("[409] returns 409 and does NOT call generateDocument when bilgiTamam is false", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValueOnce({
      id: "c1",
      kategori: "tuketici",
      belgeTipi: "THH",
      merci: "İlçe THH",
      eksikBilgiler: ["tarih"],
      bilgiTamam: false,
    } as any);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Bilgiler henüz tamamlanmadı.");
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("[409] returns 409 and does NOT call generateDocument when case classification is incomplete", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValueOnce({
      id: "c1",
      kategori: "tuketici",
      belgeTipi: null,
      merci: "İlçe THH",
      eksikBilgiler: [],
      bilgiTamam: true,
    } as any);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Vaka sınıflandırması eksik.");
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

  it("[SECURITY] owned case with different/missing session returns 404 — generateDocument NOT called", async () => {
    oturumCurrentUser.mockResolvedValue(null);
    vi.mocked(prisma.case.findUnique).mockResolvedValueOnce({
      id: "c1",
      userId: "owner",
      kategori: "tuketici",
      belgeTipi: "THH",
      merci: "İlçe THH",
      eksikBilgiler: [],
      bilgiTamam: true,
    } as any);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Vaka bulunamadı");
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });
});
