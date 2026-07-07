import Link from "next/link";
import { IconScales } from "@/components/icons";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container" style={{ paddingTop: 52, paddingBottom: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32, alignItems: "start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--green-700)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconScales size={19} />
              </span>
              <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 19, color: "#fff" }}>Hukuki Asistan</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, maxWidth: "34ch", color: "#8fab9e" }}>
              Yapay zekâ ile derdinizi anlatın, size uygun resmi hukuki belge taslağını dakikalar içinde hazırlayın.
            </p>
          </div>
          <div>
            <p className="footer-heading">BAĞLANTILAR</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/kvkk">KVKK Aydınlatma Metni</Link>
              <Link href="/chat">Belge Hazırla</Link>
              <Link href="/giris">Giriş Yap</Link>
            </div>
          </div>
          <div>
            <p className="footer-heading">SORUMLULUK REDDİ</p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "#8fab9e", maxWidth: "36ch" }}>
              Bu bir taslaktır, hukuki tavsiye değildir. Sorumluluk kullanıcıdadır.
            </p>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #123f30", marginTop: 36, paddingTop: 22, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, color: "#6f8f81" }}>© {new Date().getFullYear()} Hukuki Asistan. Tüm hakları saklıdır.</span>
          <span style={{ fontSize: 13.5, color: "#6f8f81" }}>Güvenli ödeme • iyzico</span>
        </div>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <span style={{ fontSize: 12.5, color: "#6f8f81" }}>Copyright 2026</span>
        </div>
      </div>
    </footer>
  );
}
