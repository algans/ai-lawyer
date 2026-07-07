import { describe, it, expect, vi, beforeEach } from "vitest";

const { oturumCurrentUser } = vi.hoisted(() => ({ oturumCurrentUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ oturumCurrentUser }));

import { GET } from "./route";

describe("GET /api/auth/me", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns girisYapildi=true for a valid session", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    const res = await GET(new Request("http://t") as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ girisYapildi: true });
  });

  it("returns girisYapildi=false without a session", async () => {
    oturumCurrentUser.mockResolvedValue(null);
    const res = await GET(new Request("http://t") as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ girisYapildi: false });
  });

  it("does not leak userId in the response body", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    const res = await GET(new Request("http://t") as any);
    const body = await res.text();
    expect(body).not.toContain("u1");
    expect(body).not.toContain("userId");
  });
});
