import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, paymentCreate, caseUpdate, userFindUnique, oturumCurrentUser, checkoutBaslat } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  paymentCreate: vi.fn(),
  caseUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  oturumCurrentUser: vi.fn(),
  checkoutBaslat: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: {
    document: { findUnique },
    payment: { create: paymentCreate },
    case: { update: caseUpdate },
    user: { findUnique: userFindUnique },
  },
}));

vi.mock("@/lib/auth", () => ({ oturumCurrentUser }));

vi.mock("@/lib/payment/iyzico", () => ({ iyzicoProvider: { checkoutBaslat } }));

import { POST } from "./route";

describe("POST /api/payment/init", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = "http://t";
    userFindUnique.mockResolvedValue({ id: "u1", email: "u1@test.com" });
  });

  it("401 when not logged in", async () => {
    oturumCurrentUser.mockResolvedValue(null);
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    expect((await POST(req as any)).status).toBe(401);
  });

  it("400 when body is missing documentId", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ foo: "bar" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(checkoutBaslat).not.toHaveBeenCalled();
  });

  it("400 when body is non-JSON", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    const req = new Request("http://t", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(checkoutBaslat).not.toHaveBeenCalled();
  });

  it("404 when document not found", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue(null);
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "missing" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(404);
    expect(checkoutBaslat).not.toHaveBeenCalled();
  });

  it("404 when document not owned by user", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "baskasi" } });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    expect((await POST(req as any)).status).toBe(404);
    expect(checkoutBaslat).not.toHaveBeenCalled();
  });

  it("claims unowned case then starts checkout", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: null } });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok2" });
    paymentCreate.mockResolvedValue({ id: "p2" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(caseUpdate).toHaveBeenCalledWith({ where: { id: "c1" }, data: { userId: "u1" } });
    expect(checkoutBaslat).toHaveBeenCalled();
    expect((await res.json()).paymentPageUrl).toBe("https://iyz/pay");
  });

  it("starts checkout and returns paymentPageUrl", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "u1" } });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok1" });
    paymentCreate.mockResolvedValue({ id: "p1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    const res = await POST(req as any);
    expect((await res.json()).paymentPageUrl).toBe("https://iyz/pay");
    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ durum: "bekliyor", tutar: 99, iyzicoRef: "tok1" }),
      })
    );
  });

  it("callbackUrl uses APP_URL env var", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "u1" } });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok1" });
    paymentCreate.mockResolvedValue({ id: "p1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    await POST(req as any);
    expect(checkoutBaslat).toHaveBeenCalledWith(
      expect.objectContaining({ callbackUrl: "http://t/api/payment/callback" })
    );
  });

  it("does not call caseUpdate when case already has userId matching current user", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "u1" } });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok1" });
    paymentCreate.mockResolvedValue({ id: "p1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    await POST(req as any);
    expect(caseUpdate).not.toHaveBeenCalled();
  });

  it("response body only contains paymentPageUrl and does not leak document content", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "u1" }, icerik: "gizli belge icerigi" });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok1" });
    paymentCreate.mockResolvedValue({ id: "p1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    const res = await POST(req as any);
    const rawBody = await res.text();
    expect(rawBody).not.toContain("gizli belge icerigi");
    expect(rawBody).toContain("paymentPageUrl");
  });
});
