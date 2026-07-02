// Yaklaşık fiyatlar (USD / 1M token) → USD→TL≈35 kabulüyle kuruşa çevrilir.
const FIYAT_USD_PER_MTOKEN: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 15, output: 75 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};
const USD_TO_TL = 35;

export function tahminiMaliyetKurus(model: string, inputToken: number, outputToken: number): number {
  const f = FIYAT_USD_PER_MTOKEN[model] ?? { input: 1, output: 5 };
  const usd = (inputToken * f.input + outputToken * f.output) / 1_000_000;
  return Math.round(usd * USD_TO_TL * 100);
}
