import Link from "next/link";
import {
  IconShield, IconShieldCheck, IconArrowRight, IconFile, IconCheck,
  IconMessage, IconClipboard, IconCart, IconBuilding, IconHouse, IconAlertTriangle,
} from "@/components/icons";

const adimlar = [
  { no: "01", baslik: "Anlat", metin: "Yaşadığınız sorunu serbestçe anlatın veya kısa formu doldurun." },
  { no: "02", baslik: "Yapay zekâ hazırlar", metin: "Doğru belge tipi ve mercii belirlenir, resmi taslak oluşturulur." },
  { no: "03", baslik: "İndir", metin: "Önizleyin, ödeyin ve belgenizi PDF veya Word olarak indirin." },
];

const kategoriler = [
  { ikon: <IconCart size={20} />, ad: "Tüketici / Alışveriş" },
  { ikon: <IconShieldCheck size={20} />, ad: "Suç İhbarı / Savcılık" },
  { ikon: <IconBuilding size={20} />, ad: "Kamu / İdare Şikayeti" },
  { ikon: <IconHouse size={20} />, ad: "Kira / Komşu / İş" },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="container" style={{ paddingTop: 44 }}>
        <div style={{
          background: "var(--green-900)", borderRadius: 22, overflow: "hidden", position: "relative",
          padding: "clamp(36px, 5vw, 68px)", display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 40, alignItems: "center",
        }}>
          <div style={{ position: "relative", zIndex: 2 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "rgba(198,161,91,.14)", border: "1px solid rgba(198,161,91,.35)",
              color: "var(--gold-light)", padding: "6px 13px", borderRadius: 999,
              font: "600 12.5px var(--font-body)", letterSpacing: ".04em",
            }}>
              <IconShield size={14} strokeWidth={2} />
              YAPAY ZEKÂ DESTEKLİ HUKUKİ BELGE
            </span>
            <h1 style={{
              fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(32px, 4.4vw, 48px)",
              lineHeight: 1.12, color: "#fff", margin: "22px 0 16px", letterSpacing: "-.015em",
            }}>
              AI Hukuki Belge Asistanı
            </h1>
            <p style={{ fontSize: "clamp(16px, 1.8vw, 19px)", lineHeight: 1.6, color: "#c7d8cf", margin: "0 0 30px", maxWidth: "38ch" }}>
              Derdinizi anlatın, size uygun hukuki belgeyi hazırlayalım.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/chat" className="btn btn-hero">
                Belge Hazırla
                <IconArrowRight size={18} strokeWidth={2} />
              </Link>
              <a href="#nasil-calisir" className="btn btn-hero-ghost">Nasıl çalışır?</a>
            </div>
          </div>
          <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "center" }}>
            <div aria-hidden style={{
              background: "#fff", borderRadius: 14, padding: "26px 28px", width: "min(320px, 100%)",
              boxShadow: "0 24px 60px rgba(0,0,0,.28)", transform: "rotate(-2deg)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--mint)", color: "var(--green-800)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconFile size={16} strokeWidth={1.8} />
                </span>
                <span style={{ font: "600 13px var(--font-body)", color: "var(--muted)" }}>Tüketici Hakem Heyeti Dilekçesi</span>
              </div>
              <div style={{ height: 9, background: "var(--mint)", borderRadius: 5, marginBottom: 9, width: "88%" }} />
              <div style={{ height: 9, background: "var(--mint-soft)", borderRadius: 5, marginBottom: 9 }} />
              <div style={{ height: 9, background: "var(--mint-soft)", borderRadius: 5, marginBottom: 9, width: "76%" }} />
              <div style={{ height: 9, background: "var(--mint-soft)", borderRadius: 5, marginBottom: 18, width: "64%" }} />
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--success-bg)", color: "var(--success)", padding: "5px 11px", borderRadius: 999, font: "600 12px var(--font-body)" }}>
                <IconCheck size={12} strokeWidth={3} />
                Hazır
              </div>
            </div>
          </div>
          <div style={{
            position: "absolute", right: -80, top: -80, width: 340, height: 340, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,133,94,.35), transparent 68%)", zIndex: 1,
          }} />
        </div>
      </section>

      {/* Mod kartları */}
      <section className="container" style={{ paddingTop: 48, paddingBottom: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <Link href="/chat" className="mode-card">
            <span style={{ width: 52, height: 52, borderRadius: 13, background: "var(--green-800)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <IconMessage size={26} />
            </span>
            <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 22, margin: "0 0 8px" }}>Serbest Anlat</h3>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 16px" }}>
              Sohbet ederek derdinizi kendi cümlelerinizle anlatın; gerekli bilgileri biz soralım.
            </p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--green-600)", font: "600 15px var(--font-body)" }}>
              Sohbete başla <IconArrowRight size={16} strokeWidth={2} />
            </span>
          </Link>
          <Link href="/form" className="mode-card">
            <span style={{ width: 52, height: 52, borderRadius: 13, background: "var(--green-700)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <IconClipboard size={26} />
            </span>
            <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 22, margin: "0 0 8px" }}>Adım Adım Form</h3>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 16px" }}>
              Kısa bir formu doldurarak hızlıca ilerleyin; alanları biz sizin için hazırlayalım.
            </p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--green-600)", font: "600 15px var(--font-body)" }}>
              Forma başla <IconArrowRight size={16} strokeWidth={2} />
            </span>
          </Link>
        </div>
      </section>

      {/* Nasıl çalışır */}
      <section id="nasil-calisir" className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(26px, 3vw, 32px)", textAlign: "center", margin: "0 0 8px" }}>
          Nasıl çalışır?
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 16, margin: "0 0 36px" }}>Üç basit adımda belgeniz hazır.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {adimlar.map((a) => (
            <div key={a.no} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 600, color: "var(--gold)" }}>{a.no}</span>
              <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 20, margin: "8px 0" }}>{a.baslik}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: 0 }}>{a.metin}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Kategoriler */}
      <section className="container" style={{ paddingBottom: 8 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 22, margin: "0 0 18px" }}>
          Hangi konularda yardımcı oluyoruz?
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {kategoriler.map((k) => (
            <div key={k.ad} style={{ background: "var(--mint-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: "#fff", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "var(--green-800)", marginBottom: 12,
              }}>
                {k.ikon}
              </div>
              <p style={{ margin: 0, font: "600 15px var(--font-body)" }}>{k.ad}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sorumluluk reddi */}
      <section className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <div className="banner banner-warn" style={{ marginBottom: 0 }}>
          <span style={{ color: "var(--draft-ink)", flexShrink: 0, marginTop: 1 }}>
            <IconAlertTriangle size={20} strokeWidth={1.8} />
          </span>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "var(--warn-strong)" }}>Önemli:</strong> Bu bir taslaktır, hukuki tavsiye değildir. Sorumluluk kullanıcıdadır.
          </p>
        </div>
      </section>
    </main>
  );
}
