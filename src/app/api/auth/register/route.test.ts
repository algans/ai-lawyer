import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures these are available when the vi.mock factory runs
const { findUnique, create } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ default: { user: { findUnique, create } } }));

const { rateLimit, istekAnahtari } = vi.hoisted(() => ({
  rateLimit: vi.fn().mockReturnValue({ izin: true, kalan: 9 }),
  istekAnahtari: vi.fn().mockReturnValue("ip:anon"),
}));
vi.mock("@/lib/ratelimit", () => ({ rateLimit, istekAnahtari }));

import { POST } from "./route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockReturnValue({ izin: true, kalan: 9 });
    istekAnahtari.mockReturnValue("ip:anon");
  });

  it("[429] rate limit exceeded returns 429 without touching the database", async () => {
    rateLimit.mockReturnValueOnce({ izin: false, kalan: 0 });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ email: "a@b.com", parola: "gizli123" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
  it("creates a user and sets session cookie", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ email: "a@b.com", parola: "gizli123" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect((await res.json()).userId).toBe("u1");
    expect(res.headers.get("set-cookie")).toContain("oturum=");
  });
  it("rejects duplicate email with 409", async () => {
    findUnique.mockResolvedValue({ id: "existing" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ email: "a@b.com", parola: "gizli123" }) });
    expect((await POST(req as any)).status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects invalid body with 400", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ email: "x", parola: "123" }) });
    expect((await POST(req as any)).status).toBe(400);
  });
});
