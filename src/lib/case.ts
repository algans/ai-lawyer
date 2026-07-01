import { ClassificationSchema, type Classification } from "@/lib/ai/classifier";

export function caseClassification(c: {
  kategori: string | null;
  belgeTipi: string | null;
  merci: string | null;
  eksikBilgiler: string[];
}): Classification | null {
  const parsed = ClassificationSchema.safeParse({
    kategori: c.kategori,
    belgeTipi: c.belgeTipi,
    merci: c.merci,
    eksikBilgiler: c.eksikBilgiler,
  });
  return parsed.success ? parsed.data : null;
}
