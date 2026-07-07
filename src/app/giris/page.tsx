import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function GirisPage() {
  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 80, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 412 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 30, margin: "0 0 8px" }}>Giriş Yap</h1>
          <p style={{ color: "var(--muted)", fontSize: 15, margin: 0 }}>Hesabınıza giriş yaparak belgelerinize ulaşın.</p>
        </div>
        <AuthForm mod="giris" />
        <p style={{ textAlign: "center", margin: "20px 0 0", fontSize: 14.5, color: "var(--muted)" }}>
          Hesabınız yok mu?{" "}
          <Link href="/kayit" style={{ color: "var(--green-600)", fontWeight: 600, textDecoration: "none" }}>Kayıt olun</Link>
        </p>
      </div>
    </main>
  );
}
