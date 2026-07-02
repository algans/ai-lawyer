import { callClaude, MODELS } from "./client";
import type { Classification } from "./classifier";
import { GENERATOR_SYSTEM, generatorUser, SELFCHECK_SYSTEM } from "./prompts/generator";
import { SORUMLULUK_REDDI } from "@/lib/legal";

export async function generateDocument(input: {
  classification: Classification;
  toplananBilgi: string;
  ton?: "resmi" | "sert" | "uzlasmaci";
  caseId?: string;
}): Promise<string> {
  const ton = input.ton ?? "resmi";
  const draft = await callClaude({
    model: MODELS.quality,
    system: GENERATOR_SYSTEM,
    user: generatorUser(input.classification, input.toplananBilgi, ton),
    maxTokens: 4096,
    logMeta: { caseId: input.caseId, asama: "uretim" },
  });
  const checked = await callClaude({
    model: MODELS.fast,
    system: SELFCHECK_SYSTEM,
    user: draft,
    maxTokens: 4096,
    logMeta: { caseId: input.caseId, asama: "ozkontrol" },
  });
  return checked.trim() + "\n\n---\n" + SORUMLULUK_REDDI;
}
