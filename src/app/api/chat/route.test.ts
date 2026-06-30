import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  default: {
    case: { create: vi.fn() },
    message: { create: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/lib/ai/classifier", () => ({
  classify: vi.fn().mockResolvedValue({ kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: ["tarih"] }),
}));
vi.mock("@/lib/ai/collector", () => ({
  nextQuestion: vi.fn().mockResolvedValue({ soru: "Ne zaman aldınız?", tamamlandi: false }),
}));

import { POST } from "./route";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";
import { nextQuestion } from "@/lib/ai/collector";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.case.create).mockResolvedValue({ id: "c1" } as any);
    vi.mocked(prisma.message.create).mockResolvedValue({} as any);
    vi.mocked(nextQuestion).mockResolvedValue({ soru: "Ne zaman aldınız?", tamamlandi: false });
  });

  it("creates a case and asks first question on first message", async () => {
    const req = new Request("http://t/api/chat", { method: "POST", body: JSON.stringify({ mesaj: "telefon bozuk" }) });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.caseId).toBe("c1");
    expect(body.cevap).toMatch(/ne zaman/i);
    expect(body.tamamlandi).toBe(false);
  });

  it("follow-up message: appends user message and returns next question", async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      { rol: "user", icerik: "telefon bozuk", createdAt: new Date("2024-01-01T00:00:00Z") },
      { rol: "assistant", icerik: "Ne zaman aldınız?", createdAt: new Date("2024-01-01T00:00:01Z") },
    ] as any);

    const req = new Request("http://t/api/chat", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1", mesaj: "Geçen ay aldım" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(body.caseId).toBe("c1");
    expect(body.cevap).toMatch(/ne zaman/i);
    expect(body.tamamlandi).toBe(false);

    // Assert user message was appended to DB
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ caseId: "c1", rol: "user", icerik: "Geçen ay aldım" }) })
    );
    // Assert history was fetched
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { caseId: "c1" } })
    );
  });

  it("completion: returns bilgiler tamam fallback and tamamlandi:true when nextQuestion returns soru:null", async () => {
    vi.mocked(nextQuestion).mockResolvedValueOnce({ soru: null, tamamlandi: true });
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      { rol: "user", icerik: "telefon bozuk", createdAt: new Date("2024-01-01T00:00:00Z") },
      { rol: "assistant", icerik: "Ne zaman aldınız?", createdAt: new Date("2024-01-01T00:00:01Z") },
      { rol: "user", icerik: "Geçen ay", createdAt: new Date("2024-01-01T00:00:02Z") },
    ] as any);

    const req = new Request("http://t/api/chat", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1", mesaj: "Geçen ay" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(body.tamamlandi).toBe(true);
    expect(body.cevap).toContain("Bilgiler tamam");
    expect(body.caseId).toBe("c1");
  });

  it("[400] missing mesaj returns 400 and does not call classify or nextQuestion", async () => {
    const req = new Request("http://t/api/chat", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Geçersiz istek: mesaj gerekli.");
    expect(classify).not.toHaveBeenCalled();
    expect(nextQuestion).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it("[400] non-JSON body returns 400 and does not call classify or nextQuestion", async () => {
    const req = new Request("http://t/api/chat", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Geçersiz istek: mesaj gerekli.");
    expect(classify).not.toHaveBeenCalled();
    expect(nextQuestion).not.toHaveBeenCalled();
  });
});
