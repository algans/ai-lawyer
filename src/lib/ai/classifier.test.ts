import { describe, it, expect, vi } from "vitest";

vi.mock("./client", () => ({
  MODELS: { fast: "f", quality: "q" },
  callClaude: vi.fn().mockResolvedValue(
    'İşte sonuç: {"kategori":"tuketici","belgeTipi":"THH başvurusu","merci":"İlçe THH","eksikBilgiler":["satın alma tarihi"]}'
  ),
}));

import { classify, extractJson } from "./classifier";

describe("classify", () => {
  it("parses and validates classification JSON", async () => {
    const c = await classify("Telefonum bozuk çıktı, iade alamadım");
    expect(c.kategori).toBe("tuketici");
    expect(c.eksikBilgiler).toContain("satın alma tarihi");
  });
  it("extractJson pulls JSON out of surrounding text", () => {
    expect(extractJson('a {"x":1} b')).toBe('{"x":1}');
  });
});
