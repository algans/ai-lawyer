import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";
import { tahminiMaliyetKurus } from "./cost";

export const MODELS = {
  fast: "claude-haiku-4-5-20251001",
  quality: "claude-opus-4-8",
} as const;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  logMeta?: { caseId?: string; asama: string };
}): Promise<string> {
  const res = await anthropic.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (opts.logMeta) {
    try {
      const inTok = res.usage?.input_tokens ?? 0, outTok = res.usage?.output_tokens ?? 0;
      await prisma.usageLog.create({ data: {
        caseId: opts.logMeta.caseId ?? null, asama: opts.logMeta.asama, model: opts.model,
        inputToken: inTok, outputToken: outTok, tahminiKurus: tahminiMaliyetKurus(opts.model, inTok, outTok),
      } });
    } catch { /* loglama üretimi kırmaz */ }
  }
  return text;
}
