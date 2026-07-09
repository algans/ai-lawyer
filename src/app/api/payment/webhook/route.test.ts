import { describe, it, expect, vi, beforeEach } from "vitest";

const { paymentFindFirst, paymentUpdate, documentUpdate, webhookDogrula } = vi.hoisted(() => ({
  paymentFindFirst: vi.fn(),
  paymentUpdate: vi.fn(),
  documentUpdate: vi.fn(),
  webhookDogrula: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ default: {
  payment: { findFirst: paymentFindFirst, update: paymentUpdate },
  document: { update: documentUpdate },
} }));
vi.mock("@/lib/payment/stripe", () => ({ stripeProvider: { webhookDogrula } }));

import { POST } from "./route";

function webhookReq(body = "raw", sig = "sig") {
  return new Request("http://t/api/payment/webhook", {
    method: "POST",
    headers: { "stripe-signature": sig },
    body,
  });
}

describe("POST /api/payment/webhook (stripe)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("marks document odendi on a verified paid session", async () => {
    webhookDogrula.mockReturnValue({ basarili: true, ref: "cs_1", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(webhookReq() as any);
    expect(res.status).toBe(200);
    expect(documentUpdate).toHaveBeenCalledWith({ where: { id: "d1" }, data: { durum: "odendi" } });
    expect(paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ durum: "basarili" }) })
    );
  });

  it("returns 400 and does not touch DB when signature is invalid", async () => {
    webhookDogrula.mockImplementation(() => { throw new Error("Invalid signature"); });
    const res = await POST(webhookReq("raw", "badsig") as any);
    expect(res.status).toBe(400);
    expect(paymentFindFirst).not.toHaveBeenCalled();
    expect(documentUpdate).not.toHaveBeenCalled();
  });

  it("[SECURITY] paidPrice mismatch does NOT unlock document", async () => {
    webhookDogrula.mockReturnValue({ basarili: true, ref: "cs_1", paidPrice: 1, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(webhookReq() as any);
    expect(res.status).toBe(200);
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { durum: "basarisiz" } });
  });

  it("[SECURITY] currency mismatch does NOT unlock document", async () => {
    webhookDogrula.mockReturnValue({ basarili: true, ref: "cs_1", paidPrice: 99, currency: "USD" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    await POST(webhookReq() as any);
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { durum: "basarisiz" } });
  });

  it("[IDEMPOTENCY] already-basarili payment does not re-unlock", async () => {
    webhookDogrula.mockReturnValue({ basarili: true, ref: "cs_1", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "basarili" });
    const res = await POST(webhookReq() as any);
    expect(res.status).toBe(200);
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it("acknowledges (200) but does nothing when payment not found", async () => {
    webhookDogrula.mockReturnValue({ basarili: true, ref: "cs_unknown", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue(null);
    const res = await POST(webhookReq() as any);
    expect(res.status).toBe(200);
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it("marks payment basarisiz when session not paid (basarili=false)", async () => {
    webhookDogrula.mockReturnValue({ basarili: false, ref: "cs_1", paidPrice: 0, currency: "" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    await POST(webhookReq() as any);
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { durum: "basarisiz" } });
  });

  it("ignores non-checkout events (empty ref) with 200 and no DB writes", async () => {
    webhookDogrula.mockReturnValue({ basarili: false, ref: "", paidPrice: 0, currency: "" });
    const res = await POST(webhookReq() as any);
    expect(res.status).toBe(200);
    expect(paymentFindFirst).not.toHaveBeenCalled();
    expect(documentUpdate).not.toHaveBeenCalled();
  });
});
