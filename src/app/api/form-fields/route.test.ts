import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  default: {
    case: { create: vi.fn().mockResolvedValue({ id: "c1" }), findUnique: vi.fn(), update: vi.fn().mockResolvedValue({}) },
    message: { create: vi.fn().mockResolvedValue({}) },
  },
}));
vi.mock("@/lib/ai/classifier", () => ({
  classify: vi.fn().mockResolvedValue({ kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: ["tarih", "tutar"] }),
}));
vi.mock("@/lib/auth", () => ({
  oturumCurrentUser: vi.fn().mockResolvedValue(null),
}));

const { rateLimit, istekAnahtari } = vi.hoisted(() => ({
  rateLimit: vi.fn().mockReturnValue({ izin: true, kalan: 19 }),
  istekAnahtari: vi.fn().mockReturnValue("ip:anon"),
}));
vi.mock("@/lib/ratelimit", () => ({ rateLimit, istekAnahtari }));

import { POST, PUT } from "./route";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";
import { oturumCurrentUser } from "@/lib/auth";

describe("POST /api/form-fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.case.create).mockResolvedValue({ id: "c1" } as any);
    vi.mocked(prisma.message.create).mockResolvedValue({} as any);
    vi.mocked(classify).mockResolvedValue({ kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: ["tarih", "tutar"] } as any);
    vi.mocked(oturumCurrentUser).mockResolvedValue(null as any);
    rateLimit.mockReturnValue({ izin: true, kalan: 19 });
    istekAnahtari.mockReturnValue("ip:anon");
  });

  it("[429] rate limit exceeded returns 429 and does NOT call classify or case.create", async () => {
    rateLimit.mockReturnValueOnce({ izin: false, kalan: 0 });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
    expect(classify).not.toHaveBeenCalled();
    expect(prisma.case.create).not.toHaveBeenCalled();
  });

  it("returns dynamic form fields from classification", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    const body = await (await POST(req as any)).json();
    expect(body.alanlar).toEqual(["tarih", "tutar"]);
    expect(body.caseId).toBe("c1");
  });

  it("creates a Case in the database with baslik, kategori, belgeTipi, merci, eksikBilgiler", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    await POST(req as any);
    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baslik: "telefon bozuk",
          kategori: "tuketici",
          belgeTipi: "THH",
          merci: "İlçe THH",
          eksikBilgiler: ["tarih", "tutar"],
        }),
      })
    );
  });

  it("logged-in user: created case is linked to the session user (userId set)", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: "u1" } as any);

    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    await POST(req as any);

    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u1" }) })
    );
  });

  it("anonymous user: created case stays ownerless (no userId)", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    await POST(req as any);

    const data = vi.mocked(prisma.case.create).mock.calls[0][0].data as Record<string, unknown>;
    expect(data.userId ?? null).toBeNull();
  });

  it("persists the description as a user message linked to the created case", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    await POST(req as any);
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ caseId: "c1", rol: "user", icerik: "telefon bozuk" }),
      })
    );
  });

  it("returns belgeTipi from classification result", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    const body = await (await POST(req as any)).json();
    expect(body.belgeTipi).toBe("THH");
  });

  it("truncates baslik to 60 characters", async () => {
    const longAciklama = "a".repeat(80);
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: longAciklama }) });
    await POST(req as any);
    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ baslik: "a".repeat(60) }),
      })
    );
  });

  it("[422] non-legal description returns 422 and does not create a case", async () => {
    vi.mocked(classify).mockResolvedValueOnce(null as any);

    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "merhaba" }) });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBeTruthy();
    expect(prisma.case.create).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it("[400] missing aciklama returns 400 and does not call classify or case.create", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Geçersiz istek: açıklama gerekli.");
    expect(classify).not.toHaveBeenCalled();
    expect(prisma.case.create).not.toHaveBeenCalled();
  });

  it("[400] non-JSON body returns 400 and does not call classify or case.create", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Geçersiz istek: açıklama gerekli.");
    expect(classify).not.toHaveBeenCalled();
    expect(prisma.case.create).not.toHaveBeenCalled();
  });
});

describe("PUT /api/form-fields", () => {
  const kayit = { id: "c1", userId: null, eksikBilgiler: ["tarih", "tutar"], bilgiTamam: false };

  function putReq(body: unknown) {
    return new Request("http://t", { method: "PUT", body: JSON.stringify(body) });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.case.findUnique).mockResolvedValue(kayit as any);
    vi.mocked(prisma.case.update).mockResolvedValue({} as any);
    vi.mocked(prisma.message.create).mockResolvedValue({} as any);
    vi.mocked(oturumCurrentUser).mockResolvedValue(null as any);
  });

  it("[200] all required fields filled → saves summary message and sets bilgiTamam", async () => {
    const res = await PUT(putReq({ caseId: "c1", degerler: { tarih: "2-2-2026", tutar: "8500 TL" } }) as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tamamlandi).toBe(true);
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ caseId: "c1", rol: "user", icerik: "tarih: 2-2-2026\ntutar: 8500 TL" }),
      })
    );
    expect(prisma.case.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1" }, data: expect.objectContaining({ bilgiTamam: true }) })
    );
  });

  it("builds the summary only from the case's own eksikBilgiler (extra client keys ignored)", async () => {
    await PUT(putReq({ caseId: "c1", degerler: { tarih: "1-1-2026", tutar: "100 TL", fazladan: "x" } }) as any);
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ icerik: "tarih: 1-1-2026\ntutar: 100 TL" }),
      })
    );
  });

  it("[422] empty or whitespace-only field → names the missing field, no write happens", async () => {
    const res = await PUT(putReq({ caseId: "c1", degerler: { tarih: "1-1-2026", tutar: "   " } }) as any);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("tutar");
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(prisma.case.update).not.toHaveBeenCalled();
  });

  it("[404] unknown case returns 404", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null as any);
    const res = await PUT(putReq({ caseId: "yok", degerler: { tarih: "1", tutar: "2" } }) as any);
    expect(res.status).toBe(404);
    expect(prisma.case.update).not.toHaveBeenCalled();
  });

  it("[404] case owned by another user is hidden without matching session", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({ ...kayit, userId: "u1" } as any);
    const res = await PUT(putReq({ caseId: "c1", degerler: { tarih: "1", tutar: "2" } }) as any);
    expect(res.status).toBe(404);
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(prisma.case.update).not.toHaveBeenCalled();
  });

  it("[200] owner with matching session can submit", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({ ...kayit, userId: "u1" } as any);
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: "u1" } as any);
    const res = await PUT(putReq({ caseId: "c1", degerler: { tarih: "1", tutar: "2" } }) as any);
    expect(res.status).toBe(200);
  });

  it("[400] invalid body returns 400 without touching the database", async () => {
    const res = await PUT(putReq({ caseId: "c1" }) as any);
    expect(res.status).toBe(400);
    expect(prisma.case.findUnique).not.toHaveBeenCalled();
  });
});
