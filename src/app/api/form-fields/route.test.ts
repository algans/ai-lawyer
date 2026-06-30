import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  default: {
    case: { create: vi.fn().mockResolvedValue({ id: "c1" }) },
    message: { create: vi.fn().mockResolvedValue({}) },
  },
}));
vi.mock("@/lib/ai/classifier", () => ({
  classify: vi.fn().mockResolvedValue({ kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: ["tarih", "tutar"] }),
}));

import { POST } from "./route";
import prisma from "@/lib/db";
import { classify } from "@/lib/ai/classifier";

describe("POST /api/form-fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.case.create).mockResolvedValue({ id: "c1" } as any);
    vi.mocked(prisma.message.create).mockResolvedValue({} as any);
    vi.mocked(classify).mockResolvedValue({ kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: ["tarih", "tutar"] } as any);
  });

  it("returns dynamic form fields from classification", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    const body = await (await POST(req as any)).json();
    expect(body.alanlar).toEqual(["tarih", "tutar"]);
    expect(body.caseId).toBe("c1");
  });

  it("creates a Case in the database with baslik and kategori", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ aciklama: "telefon bozuk" }) });
    await POST(req as any);
    expect(prisma.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ baslik: "telefon bozuk", kategori: "tuketici" }),
      })
    );
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
