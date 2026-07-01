import { describe, it, expect } from "vitest";
import { caseClassification } from "./case";

describe("caseClassification", () => {
  it("builds a Classification from a fully populated case row", () => {
    const c = caseClassification({ kategori: "tuketici", belgeTipi: "THH başvurusu", merci: "İlçe THH", eksikBilgiler: ["tarih"] });
    expect(c).toEqual({ kategori: "tuketici", belgeTipi: "THH başvurusu", merci: "İlçe THH", eksikBilgiler: ["tarih"] });
  });
  it("returns null when kategori is missing", () => {
    expect(caseClassification({ kategori: null, belgeTipi: "x", merci: "y", eksikBilgiler: [] })).toBeNull();
  });
  it("returns null when belgeTipi/merci missing", () => {
    expect(caseClassification({ kategori: "tuketici", belgeTipi: null, merci: "y", eksikBilgiler: [] })).toBeNull();
  });
});
