import { describe, it, expect, vi, beforeEach } from "vitest";

const { paymentFindFirst, paymentUpdate, documentUpdate, callbackDogrula } = vi.hoisted(() => ({
  paymentFindFirst: vi.fn(),
  paymentUpdate: vi.fn(),
  documentUpdate: vi.fn(),
  callbackDogrula: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: {
  payment: { findFirst: paymentFindFirst, update: paymentUpdate },
  document: { update: documentUpdate },
} }));

vi.mock("@/lib/payment/iyzico", () => ({ iyzicoProvider: { callbackDogrula } }));

import { POST } from "./route";

function formReq(token: string) {
  return new Request("http://t/api/payment/callback", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }).toString(),
  });
}

describe("POST /api/payment/callback", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.APP_URL = "http://t"; });

  it("marks document odendi and redirects on success", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("odeme=basarili");
    expect(documentUpdate).toHaveBeenCalledWith({ where: { id: "d1" }, data: { durum: "odendi" } });
    expect(paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ durum: "basarili" }) }));
  });

  it("does NOT unlock document on failed verification", async () => {
    callbackDogrula.mockResolvedValue({ basarili: false, iyzicoRef: "", paidPrice: 0, currency: "" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
  });

  it("[SECURITY] fake success flag in body cannot unlock document — verification is server-side only", async () => {
    callbackDogrula.mockResolvedValue({ basarili: false, iyzicoRef: "", paidPrice: 0, currency: "" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const req = new Request("http://t/api/payment/callback", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: "tok1", status: "success", basarili: "true" }).toString(),
    });
    const res = await POST(req as any);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
  });

  it("redirects basarisiz when payment not found in DB", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue(null);
    const res = await POST(formReq("tok_unknown") as any);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it("redirects basarisiz when token is missing", async () => {
    const req = new Request("http://t/api/payment/callback", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(callbackDogrula).not.toHaveBeenCalled();
    expect(documentUpdate).not.toHaveBeenCalled();
  });

  it("updates payment iyzicoRef to real paymentId on success", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "real-pay-id-123", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { durum: "basarili", iyzicoRef: "real-pay-id-123" },
    });
    expect(res.headers.get("location")).toContain("odeme=basarili");
  });

  it("marks payment as basarisiz on failed verification", async () => {
    callbackDogrula.mockResolvedValue({ basarili: false, iyzicoRef: "", paidPrice: 0, currency: "" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    await POST(formReq("tok1") as any);
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { durum: "basarisiz" } });
  });

  it("[SECURITY] paidPrice mismatch — basarili:true but paidPrice:1 does NOT unlock document", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 1, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { durum: "basarisiz" } });
  });

  it("[SECURITY] currency mismatch — basarili:true but currency:USD does NOT unlock document", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 99, currency: "USD" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { durum: "basarisiz" } });
  });

  it("[IDEMPOTENCY] double callback — payment already basarili — does NOT call documentUpdate again", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "basarili" });
    const res = await POST(formReq("tok1") as any);
    expect(res.headers.get("location")).toContain("odeme=basarili");
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
  });
});
