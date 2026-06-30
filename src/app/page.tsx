import Link from "next/link";
export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
      <h1>AI Hukuki Belge Asistanı</h1>
      <p>Derdinizi anlatın, size uygun hukuki belgeyi hazırlayalım.</p>
      <p><em>Bu bir taslaktır, hukuki tavsiye değildir. Sorumluluk kullanıcıdadır.</em></p>
      <Link href="/chat"><button>💬 Serbest Anlat</button></Link>
      <Link href="/form"><button>📋 Adım Adım Form</button></Link>
    </main>
  );
}
