import { z } from "zod";
import { callClaude, MODELS } from "./client";
import { CLASSIFIER_SYSTEM, classifierUser } from "./prompts/classifier";

export const ClassificationSchema = z.object({
  kategori: z.enum(["tuketici", "savcilik", "kamu", "kira_komsu_is"]),
  belgeTipi: z.string().min(1),
  merci: z.string().min(1),
  eksikBilgiler: z.array(z.string()),
});
export type Classification = z.infer<typeof ClassificationSchema>;

// null = metin hukuki bir sorun anlatmıyor (selamlaşma vb.) — prompt'taki açık sözleşme.
export async function classify(anlatim: string): Promise<Classification | null> {
  const raw = await callClaude({
    model: MODELS.fast,
    system: CLASSIFIER_SYSTEM,
    user: classifierUser(anlatim),
  });
  const json = JSON.parse(extractJson(raw));
  if (json !== null && typeof json === "object" && (json as Record<string, unknown>).kategori === null) {
    return null;
  }
  return ClassificationSchema.parse(json);
}

export function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI yanıtında JSON bulunamadı");
  return text.slice(start, end + 1);
}
