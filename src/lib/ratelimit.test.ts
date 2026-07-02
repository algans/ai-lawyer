import { describe, it, expect } from "vitest";
import { rateLimit } from "./ratelimit";
describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = "test-" + Math.random();
    expect(rateLimit(key, 2, 60).izin).toBe(true);
    expect(rateLimit(key, 2, 60).izin).toBe(true);
    expect(rateLimit(key, 2, 60).izin).toBe(false);
  });
});
