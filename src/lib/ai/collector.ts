import { z } from "zod";
import { callClaude, MODELS } from "./client";
import { extractJson } from "./classifier";
import { COLLECTOR_SYSTEM, collectorUser } from "./prompts/collector";

const NextQuestionSchema = z.object({
  soru: z.string().nullable(),
  tamamlandi: z.boolean(),
});

export async function nextQuestion(
  history: { rol: string; icerik: string }[],
  eksikBilgiler: string[]
): Promise<{ soru: string | null; tamamlandi: boolean }> {
  const raw = await callClaude({
    model: MODELS.fast,
    system: COLLECTOR_SYSTEM,
    user: collectorUser(history, eksikBilgiler),
  });
  return NextQuestionSchema.parse(JSON.parse(extractJson(raw)));
}
