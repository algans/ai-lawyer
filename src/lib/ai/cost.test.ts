import { describe, it, expect } from "vitest";
import { tahminiMaliyetKurus } from "./cost";
describe("tahminiMaliyetKurus", () => {
  it("computes opus cost in kurus", () => {
    // 1M input + 1M output opus = (15+75) usd * 35 * 100 kurus
    expect(tahminiMaliyetKurus("claude-opus-4-8", 1_000_000, 1_000_000)).toBe(Math.round(90 * 35 * 100));
  });
  it("falls back for unknown model without throwing", () => {
    expect(tahminiMaliyetKurus("bilinmeyen", 1000, 1000)).toBeGreaterThanOrEqual(0);
  });
});
