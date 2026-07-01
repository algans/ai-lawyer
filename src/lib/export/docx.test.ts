import { describe, it, expect } from "vitest";
import { belgeyiDocx } from "./docx";
describe("belgeyiDocx", () => {
  it("produces a non-empty docx buffer", async () => {
    const buf = await belgeyiDocx("Başlık\n\nİçerik satırı.");
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK"); // zip/docx magic
  });
});
