import { describe, it, expect, vi, beforeEach } from "vitest";

const { caseFindMany, oturumCurrentUser } = vi.hoisted(() => ({
  caseFindMany: vi.fn(),
  oturumCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: {
    case: { findMany: caseFindMany },
  },
}));

vi.mock("@/lib/auth", () => ({ oturumCurrentUser }));

import { GET } from "./route";

describe("GET /api/cases", () => {
  const GIZLI_ICERIK = "GIZLI-BELGE-ICERIGI-SENTINEL-12345";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 oturum yoksa ve prisma çağrılmaz", async () => {
    oturumCurrentUser.mockResolvedValue(null);
    const req = new Request("http://localhost/api/cases");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(caseFindMany).not.toHaveBeenCalled();
  });

  it("200 oturum varsa davaları döner", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    caseFindMany.mockResolvedValue([
      {
        id: "c1",
        baslik: "Test Dava",
        kategori: "THH",
        createdAt: new Date("2024-01-01"),
        documents: [
          { id: "d1", tip: "THH", durum: "odendi", createdAt: new Date("2024-01-02") },
        ],
      },
    ]);
    const req = new Request("http://localhost/api/cases");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cases).toHaveLength(1);
    expect(body.cases[0].id).toBe("c1");
    expect(body.cases[0].documents).toHaveLength(1);
    expect(body.cases[0].documents[0].durum).toBe("odendi");
  });

  it("[SECURITY] yanıt gövdesi icerik alanı içermez", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    // Mock, include:true regresyonunu simüle eder — document nesnesinde icerik alanı VAR.
    // Route select kullandığı için bu alanı yanıta geçirmemeli; test bunu kanıtlar.
    caseFindMany.mockResolvedValue([
      {
        id: "c1",
        baslik: "Test Dava",
        kategori: "THH",
        createdAt: new Date("2024-01-01"),
        documents: [
          { id: "d1", tip: "THH", durum: "taslak", createdAt: new Date("2024-01-02"), icerik: GIZLI_ICERIK },
        ],
        icerik: GIZLI_ICERIK,
      },
    ]);
    const req = new Request("http://localhost/api/cases");
    const res = await GET(req as any);
    const rawBody = await res.text();
    expect(rawBody).not.toContain(GIZLI_ICERIK);
    expect(rawBody).not.toContain("icerik");
  });

  it("[SECURITY] Prisma select icerik içermez", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    caseFindMany.mockResolvedValue([]);
    const req = new Request("http://localhost/api/cases");
    await GET(req as any);
    expect(caseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          documents: expect.objectContaining({
            select: expect.not.objectContaining({ icerik: expect.anything() }),
          }),
        }),
      })
    );
  });

  it("[SECURITY] belge nesnesi sadece izin verilen alanları içerir", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    caseFindMany.mockResolvedValue([
      {
        id: "c1",
        baslik: "Test",
        kategori: "Diğer",
        createdAt: new Date("2024-01-01"),
        documents: [
          { id: "d1", tip: "THH", durum: "odendi", createdAt: new Date("2024-01-02") },
        ],
      },
    ]);
    const req = new Request("http://localhost/api/cases");
    const res = await GET(req as any);
    const body = await res.json();
    const doc = body.cases[0].documents[0];
    const docKeys = Object.keys(doc).sort();
    // Only these 4 keys are allowed
    expect(docKeys).toEqual(["createdAt", "durum", "id", "tip"]);
  });

  it("userId'ye göre davalar sorgulanır", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u42" });
    caseFindMany.mockResolvedValue([]);
    const req = new Request("http://localhost/api/cases");
    await GET(req as any);
    expect(caseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u42" },
      })
    );
  });

  it("davalar createdAt desc sırasında döner", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    caseFindMany.mockResolvedValue([]);
    const req = new Request("http://localhost/api/cases");
    await GET(req as any);
    expect(caseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });
});
