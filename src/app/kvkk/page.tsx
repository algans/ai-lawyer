import { KVKK_AYDINLATMA, SORUMLULUK_REDDI } from "@/lib/legal";

export default function KvkkPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "44px 22px 72px" }}>
      <span style={{ font: "600 12.5px var(--font-body)", letterSpacing: ".08em", color: "var(--gold)" }}>
        HUKUKİ BİLGİLENDİRME
      </span>
      <h1 style={{
        fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(28px, 3.4vw, 38px)",
        margin: "8px 0 34px", lineHeight: 1.2,
      }}>
        KVKK Aydınlatma Metni
      </h1>

      <pre style={{
        whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "inherit",
        fontSize: 16, lineHeight: 1.75, color: "#31423a", margin: 0,
      }}>
        {KVKK_AYDINLATMA}
      </pre>

      <div className="banner banner-warn" style={{ marginTop: 28, marginBottom: 0, borderRadius: 12 }}>
        <p style={{ margin: 0 }}>
          <strong style={{ color: "var(--warn-strong)" }}>Sorumluluk Reddi:</strong> {SORUMLULUK_REDDI}
        </p>
      </div>
    </main>
  );
}
