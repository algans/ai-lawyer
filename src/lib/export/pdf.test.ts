import { describe, it, expect } from "vitest";
import { belgeyiPdf } from "./pdf";
describe("belgeyiPdf", () => {
  it("produces a non-empty pdf buffer", async () => {
    const buf = await belgeyiPdf("Başlık\n\nİçerik satırı.");
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
