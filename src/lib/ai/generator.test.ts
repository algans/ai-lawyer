import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => {
  return { MODELS: { fast: "f", quality: "q" }, callClaude: vi.fn() };
});

import { generateDocument } from "./generator";
import { callClaude } from "./client";

const callClaudeMock = callClaude as ReturnType<typeof vi.fn>;

describe("generateDocument", () => {
  beforeEach(() => {
    callClaudeMock.mockClear();
  });

  it("generates draft then runs self-check, returns cleaned text", async () => {
    callClaudeMock
      .mockResolvedValueOnce("TASLAK BELGE [DOLDURUN]")
      .mockResolvedValueOnce("TEMİZ BELGE METNİ");

    const doc = await generateDocument({
      classification: { kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [] },
      toplananBilgi: "Ad: Ali, Tarih: 01.01.2026",
    });
    expect(doc).toBe("TEMİZ BELGE METNİ");
    expect(callClaudeMock).toHaveBeenCalledTimes(2);
  });

  it("calls Opus (quality) for draft generation", async () => {
    callClaudeMock
      .mockResolvedValueOnce("DRAFT")
      .mockResolvedValueOnce("CHECKED");

    await generateDocument({
      classification: { kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [] },
      toplananBilgi: "Test",
    });

    const firstCall = callClaudeMock.mock.calls[0][0];
    expect(firstCall.model).toBe("q"); // MODELS.quality
  });

  it("calls Haiku (fast) for self-check", async () => {
    callClaudeMock
      .mockResolvedValueOnce("DRAFT")
      .mockResolvedValueOnce("CHECKED");

    await generateDocument({
      classification: { kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [] },
      toplananBilgi: "Test",
    });

    const secondCall = callClaudeMock.mock.calls[1][0];
    expect(secondCall.model).toBe("f"); // MODELS.fast
  });

  it("trims whitespace from self-check result", async () => {
    callClaudeMock
      .mockResolvedValueOnce("DRAFT")
      .mockResolvedValueOnce("  \n  TEMİZ BELGE METNİ  \n  ");

    const doc = await generateDocument({
      classification: { kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [] },
      toplananBilgi: "Test",
    });

    expect(doc).toBe("TEMİZ BELGE METNİ");
  });

  it("uses default ton='resmi' when not provided", async () => {
    callClaudeMock
      .mockResolvedValueOnce("DRAFT")
      .mockResolvedValueOnce("CHECKED");

    await generateDocument({
      classification: { kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [] },
      toplananBilgi: "Test",
    });

    const firstCall = callClaudeMock.mock.calls[0][0];
    expect(firstCall.user).toContain("Ton: resmi");
  });

  it("uses provided ton when specified", async () => {
    callClaudeMock
      .mockResolvedValueOnce("DRAFT")
      .mockResolvedValueOnce("CHECKED");

    await generateDocument({
      classification: { kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [] },
      toplananBilgi: "Test",
      ton: "sert",
    });

    const firstCall = callClaudeMock.mock.calls[0][0];
    expect(firstCall.user).toContain("Ton: sert");
  });

  it("passes draft output as user message to self-check", async () => {
    const draftText = "GENERATED DRAFT TEXT";
    callClaudeMock
      .mockResolvedValueOnce(draftText)
      .mockResolvedValueOnce("CHECKED");

    await generateDocument({
      classification: { kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [] },
      toplananBilgi: "Test",
    });

    const secondCall = callClaudeMock.mock.calls[1][0];
    expect(secondCall.user).toBe(draftText);
  });
});
