import { describe, it, expect, vi, beforeEach } from "vitest";

const { checkoutFormInitialize, checkoutForm } = vi.hoisted(() => ({
  checkoutFormInitialize: { create: vi.fn() },
  checkoutForm: { retrieve: vi.fn() },
}));
vi.mock("iyzipay", () => ({
  default: class {
    static LOCALE = { TR: "tr" };
    static CURRENCY = { TRY: "TRY" };
    static PAYMENT_GROUP = { PRODUCT: "PRODUCT" };
    static BASKET_ITEM_TYPE = { VIRTUAL: "VIRTUAL" };
    checkoutFormInitialize = checkoutFormInitialize;
    checkoutForm = checkoutForm;
  },
}));
import { iyzicoProvider } from "./iyzico";

describe("iyzicoProvider", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("checkoutBaslat resolves paymentPageUrl + token on success", async () => {
    checkoutFormInitialize.create.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "success", token: "tok1", paymentPageUrl: "https://iyz/pay/tok1" }));
    const r = await iyzicoProvider.checkoutBaslat({
      documentId: "d1", tutar: 99, conversationId: "c1",
      callbackUrl: "http://t/cb", buyerEmail: "a@b.com", buyerId: "u1",
    });
    expect(r).toEqual({ paymentPageUrl: "https://iyz/pay/tok1", token: "tok1" });
  });
  it("checkoutBaslat rejects when iyzico returns failure status", async () => {
    checkoutFormInitialize.create.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "failure", errorMessage: "hata" }));
    await expect(iyzicoProvider.checkoutBaslat({
      documentId: "d1", tutar: 99, conversationId: "c1",
      callbackUrl: "http://t/cb", buyerEmail: "a@b.com", buyerId: "u1",
    })).rejects.toThrow();
  });
  it("callbackDogrula returns basarili=true when paymentStatus SUCCESS", async () => {
    checkoutForm.retrieve.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "success", paymentStatus: "SUCCESS", paymentId: "pay1" }));
    expect(await iyzicoProvider.callbackDogrula("tok1")).toEqual({ basarili: true, iyzicoRef: "pay1" });
  });
  it("callbackDogrula returns basarili=false when not SUCCESS", async () => {
    checkoutForm.retrieve.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "success", paymentStatus: "FAILURE", paymentId: "pay1" }));
    expect((await iyzicoProvider.callbackDogrula("tok1")).basarili).toBe(false);
  });
});
