export type EvalSenaryo = { anlatim: string; beklenenKategori: string; merciIcermeli: string; icermemeli: string[] };
import type { Classification } from "@/lib/ai/classifier";

export function degerlendir(s: EvalSenaryo, c: Classification, belge: string): { gecti: boolean; sebepler: string[] } {
  const sebepler: string[] = [];
  if (c.kategori !== s.beklenenKategori) sebepler.push(`kategori: beklenen ${s.beklenenKategori}, gelen ${c.kategori}`);
  const havuz = `${c.merci} ${belge}`.toLowerCase();
  if (!havuz.includes(s.merciIcermeli.toLowerCase())) sebepler.push(`merci "${s.merciIcermeli}" bulunamadı`);
  for (const yasak of s.icermemeli) if (belge.includes(yasak)) sebepler.push(`yasak ifade var: ${yasak}`);
  if (/\b\d+\.?\s*madde\b/i.test(belge)) sebepler.push("kesin kanun maddesi numarası tespit edildi (uydurma riski)");
  return { gecti: sebepler.length === 0, sebepler };
}
