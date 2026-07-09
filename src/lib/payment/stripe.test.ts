import { describe, it, expect, vi, beforeEach } from "vitest";

const { sessionsCreate, constructEvent } = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  constructEvent: vi.fn(),
}));
vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: sessionsCreate } };
    webhooks = { constructEvent };
  },
}));
import { stripeProvider } from "./stripe";

const input = {
  documentId: "d1", tutar: 99, conversationId: "c1",
  callbackUrl: "http://t/api/payment/callback", buyerEmail: "a@b.com", buyerId: "u1",
};

describe("stripeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = "http://t";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  });

  it("checkoutBaslat creates a Checkout Session and returns paymentPageUrl + token", async () => {
    sessionsCreate.mockResolvedValue({ id: "cs_1", url: "https://stripe/pay/cs_1" });
    const r = await stripeProvider.checkoutBaslat(input);
    expect(r).toEqual({ paymentPageUrl: "https://stripe/pay/cs_1", token: "cs_1" });
  });

  it("checkoutBaslat sends amount in kuruş (99 TRY → 9900) with lowercase currency", async () => {
    sessionsCreate.mockResolvedValue({ id: "cs_1", url: "https://stripe/pay" });
    await stripeProvider.checkoutBaslat(input);
    const arg = sessionsCreate.mock.calls[0][0];
    expect(arg.mode).toBe("payment");
    expect(arg.line_items[0].price_data.unit_amount).toBe(9900);
    expect(arg.line_items[0].price_data.currency).toBe("try");
  });

  it("webhookDogrula normalizes a paid checkout.session.completed event (9900→99, try→TRY)", () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", payment_status: "paid", amount_total: 9900, currency: "try" } },
    });
    expect(stripeProvider.webhookDogrula("raw", "sig")).toEqual({
      basarili: true, ref: "cs_1", paidPrice: 99, currency: "TRY",
    });
  });

  it("webhookDogrula returns basarili=false when payment_status is not paid", () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", payment_status: "unpaid", amount_total: 9900, currency: "try" } },
    });
    expect(stripeProvider.webhookDogrula("raw", "sig").basarili).toBe(false);
  });

  it("webhookDogrula returns basarili=false + empty ref for non-completion events", () => {
    constructEvent.mockReturnValue({ type: "payment_intent.created", data: { object: {} } });
    const r = stripeProvider.webhookDogrula("raw", "sig");
    expect(r.basarili).toBe(false);
    expect(r.ref).toBe("");
  });

  it("webhookDogrula throws when signature verification fails", () => {
    constructEvent.mockImplementation(() => { throw new Error("Invalid signature"); });
    expect(() => stripeProvider.webhookDogrula("raw", "badsig")).toThrow();
  });

  it("webhookDogrula verifies against the RAW body + signature + webhook secret", () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", payment_status: "paid", amount_total: 9900, currency: "try" } },
    });
    stripeProvider.webhookDogrula("RAW_BODY", "SIG");
    expect(constructEvent).toHaveBeenCalledWith("RAW_BODY", "SIG", "whsec_x");
  });
});
