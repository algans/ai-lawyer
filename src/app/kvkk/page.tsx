import { KVKK_AYDINLATMA } from "@/lib/legal";

export default function KvkkPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "2rem 16px" }}>
      <h1>KVKK Aydınlatma Metni</h1>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "inherit", lineHeight: 1.6 }}>
        {KVKK_AYDINLATMA}
      </pre>
    </main>
  );
}
