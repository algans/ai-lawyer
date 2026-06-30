import { describe, it, expect } from "vitest";
import { maskPreview } from "./preview";

describe("maskPreview", () => {
  it("keeps first paragraph, masks the rest", () => {
    const out = maskPreview("İlk paragraf net.\n\nGizli içerik burada.");
    expect(out).toContain("İlk paragraf net.");
    expect(out).toContain("█");
    expect(out).not.toContain("Gizli içerik");
  });

  it("single paragraph (no double newline) returns truncated text up to 200 chars", () => {
    const short = "Kısa tek paragraf.";
    expect(maskPreview(short)).toBe(short);

    const long = "A".repeat(300);
    const result = maskPreview(long);
    expect(result.length).toBe(200);
    expect(result).not.toContain("█");
  });

  it("multi-paragraph: first paragraph remains fully readable, later paragraphs contain no original words", () => {
    const first = "Bu birinci paragraftır.";
    const second = "Bu ikinci paragraf gizli.";
    const third = "Bu üçüncü paragraf da gizli.";
    const out = maskPreview(`${first}\n\n${second}\n\n${third}`);

    // First paragraph is untouched
    expect(out.startsWith(first)).toBe(true);

    // Original words from later paragraphs should not appear
    expect(out).not.toContain("ikinci");
    expect(out).not.toContain("üçüncü");
    expect(out).not.toContain("gizli");

    // Masking characters must be present
    expect(out).toContain("█");
  });
});
