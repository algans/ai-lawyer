import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// vi.hoisted ensures findUnique is available when the vi.mock factory runs
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ default: { user: { findUnique } } }));

const { rateLimit, istekAnahtari } = vi.hoisted(() => ({
  rateLimit: vi.fn().mockReturnValue({ izin: true, kalan: 9 }),
  istekAnahtari: vi.fn().mockReturnValue("ip:anon"),
}));
vi.mock("@/lib/ratelimit", () => ({ rateLimit, istekAnahtari }));

import { POST } from "./route";

// A real bcrypt hash so dogrulaParola actually runs (not mocked)
const DOGRU_PAROLA = "dogru123";
const DOGRU_HASH = bcrypt.hashSync(DOGRU_PAROLA, 10);

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockReturnValue({ izin: true, kalan: 9 });
    istekAnahtari.mockReturnValue("ip:anon");
  });

  it("[429] rate limit exceeded returns 429 without checking credentials", async () => {
    rateLimit.mockReturnValueOnce({ izin: false, kalan: 0 });
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", parola: DOGRU_PAROLA }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("logs in and sets session cookie", async () => {
    findUnique.mockResolvedValue({ id: "u1", parolaHash: DOGRU_HASH });
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", parola: DOGRU_PAROLA }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect((await res.json()).userId).toBe("u1");
    expect(res.headers.get("set-cookie")).toContain("oturum=");
  });

  it("rejects wrong password with 401", async () => {
    findUnique.mockResolvedValue({ id: "u1", parolaHash: DOGRU_HASH });
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", parola: "yanlis999" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("rejects missing user with 401", async () => {
    findUnique.mockResolvedValue(null);
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ email: "hayir@yok.com", parola: "herhangi" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("runs a bcrypt comparison even when the email does not exist (constant-time, no enumeration)", async () => {
    findUnique.mockResolvedValue(null);
    const spy = vi.spyOn(bcrypt, "compare");
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ email: "yok@yok.com", parola: "herhangi" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    expect(spy).toHaveBeenCalled(); // kullanıcı yok olsa da hash karşılaştırması çalıştı
    spy.mockRestore();
  });

  it("rejects invalid body with 400", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ email: "bozuk-email" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
