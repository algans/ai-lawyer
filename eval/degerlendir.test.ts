import { describe, it, expect } from "vitest";
import { degerlendir } from "./degerlendir";

const s = { anlatim: "x", beklenenKategori: "tuketici", merciIcermeli: "Tüketici", icermemeli: ["[DOLDURUN]"] };

describe("degerlendir", () => {
  it("passes a correct classification+document", () => {
    const r = degerlendir(s, { kategori: "tuketici", belgeTipi: "THH", merci: "İlçe Tüketici Hakem Heyeti", eksikBilgiler: [] }, "Sayın Tüketici Hakem Heyeti...");
    expect(r.gecti).toBe(true);
  });

  it("fails on wrong category", () => {
    const r = degerlendir(s, { kategori: "kamu", belgeTipi: "X", merci: "Belediye", eksikBilgiler: [] }, "metin");
    expect(r.gecti).toBe(false);
    expect(r.sebepler.join(" ")).toMatch(/kategori/i);
  });

  it("fails when document has a placeholder", () => {
    const r = degerlendir(s, { kategori: "tuketici", belgeTipi: "THH", merci: "Tüketici Hakem Heyeti", eksikBilgiler: [] }, "Sayın ... [DOLDURUN]");
    expect(r.gecti).toBe(false);
  });

  it("fails when merci is missing from both merci field and document", () => {
    const r = degerlendir(s, { kategori: "tuketici", belgeTipi: "THH", merci: "Belediye Başkanlığı", eksikBilgiler: [] }, "Sayın Belediye Başkanlığı...");
    expect(r.gecti).toBe(false);
    expect(r.sebepler.join(" ")).toMatch(/merci/i);
  });

  it("fails when document contains a fabricated law article number", () => {
    const r = degerlendir(s, { kategori: "tuketici", belgeTipi: "THH", merci: "Tüketici Hakem Heyeti", eksikBilgiler: [] }, "Sayın Tüketici Hakem Heyeti, 42. madde gereğince talepte bulunuyorum.");
    expect(r.gecti).toBe(false);
    expect(r.sebepler.join(" ")).toMatch(/madde/i);
  });

  it("passes when document has 'madde' without a number prefix", () => {
    const r = degerlendir(s, { kategori: "tuketici", belgeTipi: "THH", merci: "Tüketici Hakem Heyeti", eksikBilgiler: [] }, "Sayın Tüketici Hakem Heyeti, ilgili madde kapsamında talepte bulunuyorum.");
    expect(r.gecti).toBe(true);
  });

  it("collects multiple failure reasons", () => {
    const r = degerlendir(s, { kategori: "savcilik", belgeTipi: "Y", merci: "Başsavcılık", eksikBilgiler: [] }, "Konu: [DOLDURUN] hakkında");
    expect(r.gecti).toBe(false);
    expect(r.sebepler.length).toBeGreaterThanOrEqual(2);
  });
});
