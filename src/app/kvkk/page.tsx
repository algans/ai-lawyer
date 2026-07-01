import { KVKK_AYDINLATMA } from "@/lib/legal";

export default function KvkkPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <h1>KVKK Aydınlatma Metni</h1>
      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.6 }}>
        {KVKK_AYDINLATMA}
      </pre>
    </main>
  );
}
