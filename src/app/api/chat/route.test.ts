import { describe, it, expect, vi, beforeEach } from "vitest";

const { oturumCurrentUser } = vi.hoisted(() => ({
  oturumCurrentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", () => ({ oturumCurrentUser }));

const { rateLimit, istekAnahtari } = vi.hoisted(() => ({
  rateLimit: vi.fn().mockReturnValue({ izin: true, kalan: 39 }),
  istekAnahtari: vi.fn().mockReturnValue("ip:anon"),
}));

vi.mock("@/lib/ratelimit", () => ({ rateLimit, istekAnahtari }));

vi.mock("@/lib/db", () => ({
  default: {
    case: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
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
    oturumCurrentUser.mockResolvedValue(null);
    rateLimit.mockReturnValue({ izin: true, kalan: 39 });
    istekAnahtari.mockReturnValue("ip:anon");
    vi.mocked(prisma.case.create).mockResolvedValue({ id: "c1" } as any);
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      id: "c1",
      eksikBilgiler: ["tarih"],
      bilgiTamam: false,
    } as any);
    vi.mocked(prisma.case.update).mockResolvedValue({} as any);
    vi.mocked(prisma.message.create).mockResolvedValue({} as any);
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(classify).mockResolvedValue({ kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: ["tarih"] } as any);
    vi.mocked(nextQuestion).mockResolvedValue({ soru: "Ne zaman aldınız?", tamamlandi: false });
  });

  it("creates a case with classification fields and asks first question on first message", async () => {
    const req = new Request("http://t/api/chat", { method: "POST", body: JSON.stringify({ mesaj: "telefon bozuk" }) });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body.caseId).toBe("c1");
    expect(body.cevap).toMatch(/ne zaman/i);
    expect(body.tamamlandi).toBe(false);

    // Assert case.create was called with classification fields
    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kategori: "tuketici",
          belgeTipi: "THH",
          merci: "İlçe THH",
          eksikBilgiler: ["tarih"],
          bilgiTamam: false,
        }),
      })
    );
  });

  it("logged-in user: created case is linked to the session user (userId set)", async () => {
    oturumCurrentUser.mockResolvedValueOnce({ userId: "u1" });

    const req = new Request("http://t/api/chat", { method: "POST", body: JSON.stringify({ mesaj: "telefon bozuk" }) });
    await POST(req as any);

    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u1" }) })
    );
  });

  it("anonymous user: created case stays ownerless (no userId)", async () => {
    const req = new Request("http://t/api/chat", { method: "POST", body: JSON.stringify({ mesaj: "telefon bozuk" }) });
    await POST(req as any);

    const data = vi.mocked(prisma.case.create).mock.calls[0][0].data as Record<string, unknown>;
    expect(data.userId ?? null).toBeNull();
  });

  it("greeting / non-legal message: replies conversationally without creating a case", async () => {
    vi.mocked(classify).mockResolvedValueOnce(null as any);

    const req = new Request("http://t/api/chat", {
      method: "POST",
      body: JSON.stringify({ caseId: null, mesaj: "merhaba" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.caseId).toBeNull();
    expect(body.tamamlandi).toBe(false);
    expect(body.cevap).toMatch(/anlatır mısınız/i);
    expect(prisma.case.create).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(nextQuestion).not.toHaveBeenCalled();
  });

  it("treats caseId:null as a first message (browser sends null before a case exists)", async () => {
    const req = new Request("http://t/api/chat", {
      method: "POST",
      body: JSON.stringify({ caseId: null, mesaj: "merhaba" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.caseId).toBe("c1");
    expect(prisma.case.create).toHaveBeenCalled();
  });

  it("follow-up message: reads classification from Case (no re-classify), returns next question", async () => {
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
    // Assert classify was NOT called in follow-up
    expect(classify).not.toHaveBeenCalled();
    // Assert case was looked up from DB
    expect(prisma.case.findUnique).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("completion: sets bilgiTamam:true on case when tamamlandi:true", async () => {
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

    // Assert bilgiTamam was updated
    expect(prisma.case.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1" }, data: { bilgiTamam: true } })
    );
  });

  it("completion: does NOT update bilgiTamam if already true", async () => {
    vi.mocked(nextQuestion).mockResolvedValueOnce({ soru: null, tamamlandi: true });
    vi.mocked(prisma.case.findUnique).mockResolvedValueOnce({
      id: "c1",
      eksikBilgiler: [],
      bilgiTamam: true,
    } as any);
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      { rol: "user", icerik: "telefon bozuk", createdAt: new Date() },
    ] as any);

    const req = new Request("http://t/api/chat", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1", mesaj: "ek bilgi" }),
    });
    await POST(req as any);

    expect(prisma.case.update).not.toHaveBeenCalled();
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

  it("[429] rate limit exceeded returns 429 and does NOT call classify or nextQuestion", async () => {
    rateLimit.mockReturnValueOnce({ izin: false, kalan: 0 });

    const req = new Request("http://t/api/chat", {
      method: "POST",
      body: JSON.stringify({ mesaj: "telefon bozuk" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("Çok fazla istek. Lütfen daha sonra tekrar deneyin.");
    expect(classify).not.toHaveBeenCalled();
    expect(nextQuestion).not.toHaveBeenCalled();
  });
});
