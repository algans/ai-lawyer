import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  MODELS: { fast: "f", quality: "q" },
  callClaude: vi.fn().mockResolvedValue(
    'İşte sonuç: {"kategori":"tuketici","belgeTipi":"THH başvurusu","merci":"İlçe THH","eksikBilgiler":["satın alma tarihi"]}'
  ),
}));

import { classify, extractJson } from "./classifier";
import { callClaude } from "./client";

describe("classify", () => {
  beforeEach(() => {
    vi.mocked(callClaude).mockReset();
    vi.mocked(callClaude).mockResolvedValue(
      'İşte sonuç: {"kategori":"tuketici","belgeTipi":"THH başvurusu","merci":"İlçe THH","eksikBilgiler":["satın alma tarihi"]}'
    );
  });

  it("parses and validates classification JSON", async () => {
    const c = await classify("Telefonum bozuk çıktı, iade alamadım");
    expect(c.kategori).toBe("tuketici");
    expect(c.eksikBilgiler).toContain("satın alma tarihi");
  });

  it("extractJson pulls JSON out of surrounding text", () => {
    expect(extractJson('a {"x":1} b')).toBe('{"x":1}');
  });

  it("wraps user anlatim in kullanici_girdisi delimiters", async () => {
    await classify("Telefonum bozuk çıktı");
    const firstCall = vi.mocked(callClaude).mock.calls[0][0];
    expect(firstCall.user).toContain("<kullanici_girdisi>");
    expect(firstCall.user).toContain("</kullanici_girdisi>");
  });

  it("rejects invalid category enum value", async () => {
    vi.mocked(callClaude).mockResolvedValueOnce(
      'İşte sonuç: {"kategori":"gecersiz","belgeTipi":"THH başvurusu","merci":"İlçe THH","eksikBilgiler":["satın alma tarihi"]}'
    );
    await expect(classify("test")).rejects.toThrow();
  });

  it("rejects when required field eksikBilgiler is missing", async () => {
    vi.mocked(callClaude).mockResolvedValueOnce(
      'İşte sonuç: {"kategori":"tuketici","belgeTipi":"X","merci":"Y"}'
    );
    await expect(classify("test")).rejects.toThrow();
  });

  it("extractJson throws when there is no JSON in the text", () => {
    expect(() => extractJson("hiç json yok")).toThrow();
  });
});
