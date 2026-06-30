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

describe("POST /api/form-fields", () => {
  beforeEach(() => {
    vi.mocked(prisma.case.create).mockResolvedValue({ id: "c1" } as any);
    vi.mocked(prisma.message.create).mockResolvedValue({} as any);
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
});
