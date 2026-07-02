import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("./client", () => ({
  MODELS: { fast: "f", quality: "q" },
  callClaude: vi.fn().mockResolvedValue('{"soru":"Ürünü ne zaman aldınız?","tamamlandi":false}'),
}));
import { nextQuestion } from "./collector";
import { callClaude } from "./client";

describe("nextQuestion", () => {
  beforeEach(() => {
    vi.mocked(callClaude).mockReset();
    vi.mocked(callClaude).mockResolvedValue('{"soru":"Ürünü ne zaman aldınız?","tamamlandi":false}');
  });

  it("returns the next single question", async () => {
    const r = await nextQuestion([{ rol: "user", icerik: "telefon bozuk" }], ["tarih"]);
    expect(r.tamamlandi).toBe(false);
    expect(r.soru).toMatch(/ne zaman/i);
  });

  it("returns completion when tamamlandi is true and soru is null", async () => {
    vi.mocked(callClaude).mockResolvedValueOnce('{"soru":null,"tamamlandi":true}');
    const r = await nextQuestion([{ rol: "user", icerik: "telefon bozuk" }], []);
    expect(r.tamamlandi).toBe(true);
    expect(r.soru).toBeNull();
  });

  it("wraps history icerik in kullanici_girdisi delimiters", async () => {
    await nextQuestion([{ rol: "user", icerik: "telefon bozuk" }], ["tarih"]);
    const firstCall = vi.mocked(callClaude).mock.calls[0][0];
    expect(firstCall.user).toContain("<kullanici_girdisi>");
    expect(firstCall.user).toContain("</kullanici_girdisi>");
  });

  it("rejects invalid schema - wrong type for tamamlandi", async () => {
    vi.mocked(callClaude).mockResolvedValueOnce('{"tamamlandi":"evet"}');
    await expect(nextQuestion([{ rol: "user", icerik: "telefon bozuk" }], ["x"])).rejects.toThrow();
  });

  it("rejects invalid schema - missing soru field", async () => {
    vi.mocked(callClaude).mockResolvedValueOnce('{"tamamlandi":false}');
    await expect(nextQuestion([{ rol: "user", icerik: "telefon bozuk" }], ["x"])).rejects.toThrow();
  });
});
