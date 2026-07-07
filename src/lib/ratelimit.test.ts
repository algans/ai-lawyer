import { describe, it, expect } from "vitest";
import { rateLimit, istekAnahtari } from "./ratelimit";
describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = "test-" + Math.random();
    expect(rateLimit(key, 2, 60).izin).toBe(true);
    expect(rateLimit(key, 2, 60).izin).toBe(true);
    expect(rateLimit(key, 2, 60).izin).toBe(false);
  });
});

function reqWith(xff?: string) {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? xff ?? null : null) },
  } as any;
}

describe("istekAnahtari", () => {
  it("authenticated user is keyed by userId (not spoofable via headers)", () => {
    expect(istekAnahtari(reqWith("1.2.3.4"), "u1")).toBe("u:u1");
  });

  it("no trusted proxy: uses only the first XFF entry, not the whole header", () => {
    const onceki = process.env.GUVENILEN_PROXY_SAYISI;
    delete process.env.GUVENILEN_PROXY_SAYISI;
    try {
      expect(istekAnahtari(reqWith("1.1.1.1, 2.2.2.2"))).toBe("ip:1.1.1.1");
    } finally {
      process.env.GUVENILEN_PROXY_SAYISI = onceki;
    }
  });

  it("behind a trusted proxy: uses the proxy-appended (rightmost) client IP", () => {
    const onceki = process.env.GUVENILEN_PROXY_SAYISI;
    process.env.GUVENILEN_PROXY_SAYISI = "1";
    try {
      // Saldırgan soldaki değeri taklit etse de güvenilen proxy gerçek IP'yi sona ekler.
      expect(istekAnahtari(reqWith("sahte-ip, 9.9.9.9"))).toBe("ip:9.9.9.9");
    } finally {
      process.env.GUVENILEN_PROXY_SAYISI = onceki;
    }
  });

  it("no XFF header falls back to anon", () => {
    expect(istekAnahtari(reqWith(undefined))).toBe("ip:anon");
  });
});
