import { describe, it, expect } from "vitest";
import { hashParola, dogrulaParola, oturumTokeni, oturumDogrula } from "./auth";

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
});
