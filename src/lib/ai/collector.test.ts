import { describe, it, expect, vi } from "vitest";
vi.mock("./client", () => ({
  MODELS: { fast: "f", quality: "q" },
  callClaude: vi.fn().mockResolvedValue('{"soru":"Ürünü ne zaman aldınız?","tamamlandi":false}'),
}));
import { nextQuestion } from "./collector";

describe("nextQuestion", () => {
  it("returns the next single question", async () => {
    const r = await nextQuestion([{ rol: "user", icerik: "telefon bozuk" }], ["tarih"]);
    expect(r.tamamlandi).toBe(false);
    expect(r.soru).toMatch(/ne zaman/i);
  });
});
