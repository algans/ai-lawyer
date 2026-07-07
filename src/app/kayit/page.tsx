import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function KayitPage() {
  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 80, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 428 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 30, margin: "0 0 8px" }}>Kayıt Ol</h1>
          <p style={{ color: "var(--muted)", fontSize: 15, margin: 0 }}>Birkaç saniyede hesabınızı oluşturun.</p>
        </div>
        <AuthForm mod="kayit" />
        <p style={{ textAlign: "center", margin: "20px 0 0", fontSize: 14.5, color: "var(--muted)" }}>
          Zaten hesabınız var mı?{" "}
          <Link href="/giris" style={{ color: "var(--green-600)", fontWeight: 600, textDecoration: "none" }}>Giriş yapın</Link>
        </p>
      </div>
    </main>
  );
}
