import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { hashParola, dogrulaParola, oturumTokeni, oturumDogrula, oturumCurrentUser } from "./auth";

describe("auth", () => {
  it("hashes and verifies a password round-trip", async () => {
    const h = await hashParola("gizli123");
    expect(h).not.toBe("gizli123");
    expect(await dogrulaParola("gizli123", h)).toBe(true);
    expect(await dogrulaParola("yanlis", h)).toBe(false);
  });
  it("signs a session token and verifies it", async () => {
    const t = await oturumTokeni("user-1");
    expect(await oturumDogrula(t)).toEqual({ userId: "user-1" });
  });
  it("returns null for a bad/absent token", async () => {
    expect(await oturumDogrula(undefined)).toBeNull();
    expect(await oturumDogrula("bozuk.token.xyz")).toBeNull();
  });
  it("refuses to sign when SESSION_SECRET is missing (no empty-key forgery)", async () => {
    const onceki = process.env.SESSION_SECRET;
    try {
      delete process.env.SESSION_SECRET;
      await expect(oturumTokeni("user-1")).rejects.toThrow(/SESSION_SECRET/);
    } finally {
      process.env.SESSION_SECRET = onceki;
    }
  });
  it("refuses to sign when SESSION_SECRET is shorter than 32 chars", async () => {
    const onceki = process.env.SESSION_SECRET;
    try {
      process.env.SESSION_SECRET = "kisa-secret";
      await expect(oturumTokeni("user-1")).rejects.toThrow(/32/);
    } finally {
      process.env.SESSION_SECRET = onceki;
    }
  });

  it("oturumCurrentUser: Bearer başlığındaki geçerli token'ı çözer (cookie yokken)", async () => {
    const t = await oturumTokeni("user-9");
    const req = new NextRequest("http://t/api/x", { headers: { authorization: `Bearer ${t}` } });
    expect(await oturumCurrentUser(req)).toEqual({ userId: "user-9" });
  });
  it("oturumCurrentUser: cookie geçerliyse Bearer'a bakmadan onu kullanır (geriye uyumluluk)", async () => {
    const t = await oturumTokeni("user-cookie");
    const req = new NextRequest("http://t/api/x", { headers: { cookie: `oturum=${t}` } });
    expect(await oturumCurrentUser(req)).toEqual({ userId: "user-cookie" });
  });
  it("oturumCurrentUser: geçersiz Bearer için null döner", async () => {
    const req = new NextRequest("http://t/api/x", { headers: { authorization: "Bearer bozuk.token.xyz" } });
    expect(await oturumCurrentUser(req)).toBeNull();
  });
  it("oturumCurrentUser: ne cookie ne Bearer varsa null döner", async () => {
    const req = new NextRequest("http://t/api/x");
    expect(await oturumCurrentUser(req)).toBeNull();
  });
});
