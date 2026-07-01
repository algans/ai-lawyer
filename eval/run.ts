import { classify } from "@/lib/ai/classifier";
import { generateDocument } from "@/lib/ai/generator";
import { degerlendir, type EvalSenaryo } from "./degerlendir";
import altinSet from "./altin-set.json";

if (process.env.EVAL !== "1") {
  console.log("eval skipped (set EVAL=1 + ANTHROPIC_API_KEY)");
  process.exit(0);
}

async function main() {
  const senaryolar = altinSet as EvalSenaryo[];
  let gecenSayi = 0;
  let kalanSayi = 0;
  const kalanlar: { anlatim: string; sebepler: string[] }[] = [];

  for (const senaryo of senaryolar) {
    console.log(`\n→ Senaryo: ${senaryo.anlatim.slice(0, 60)}...`);
    try {
      const classification = await classify(senaryo.anlatim);
      const sahteEkBilgi = classification.eksikBilgiler.map((e) => `${e}: TEST`).join("\n");
      const belge = await generateDocument({
        classification,
        toplananBilgi: sahteEkBilgi || "test verisi",
      });
      const sonuc = degerlendir(senaryo, classification, belge);
      if (sonuc.gecti) {
        gecenSayi++;
        console.log("  ✓ GEÇTI");
      } else {
        kalanSayi++;
        kalanlar.push({ anlatim: senaryo.anlatim, sebepler: sonuc.sebepler });
        console.log("  ✗ KALDI:", sonuc.sebepler);
      }
    } catch (err) {
      kalanSayi++;
      const msg = err instanceof Error ? err.message : String(err);
      kalanlar.push({ anlatim: senaryo.anlatim, sebepler: [`hata: ${msg}`] });
      console.log("  ✗ HATA:", msg);
    }
  }

  console.log(`\n=== SONUÇ: ${gecenSayi} geçti, ${kalanSayi} kaldı (toplam ${senaryolar.length}) ===`);
  if (kalanlar.length > 0) {
    console.log("\nKalan senaryolar:");
    for (const k of kalanlar) {
      console.log(`  - ${k.anlatim.slice(0, 50)}: ${k.sebepler.join("; ")}`);
    }
  }

  process.exit(kalanSayi > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Eval hatası:", err);
  process.exit(1);
});
