import { describe, it, expect, vi } from "vitest";

const { iyzicoProvider, stripeProvider } = vi.hoisted(() => ({
  iyzicoProvider: { checkoutBaslat: vi.fn(), callbackDogrula: vi.fn() },
  stripeProvider: { checkoutBaslat: vi.fn(), webhookDogrula: vi.fn() },
}));
vi.mock("./iyzico", () => ({ iyzicoProvider }));
vi.mock("./stripe", () => ({ stripeProvider }));

import { getSaglayici } from "./index";

describe("getSaglayici", () => {
  it("returns the iyzico provider for 'iyzico'", () => {
    expect(getSaglayici("iyzico")).toBe(iyzicoProvider);
  });
  it("returns the stripe provider for 'stripe'", () => {
    expect(getSaglayici("stripe")).toBe(stripeProvider);
  });
});
