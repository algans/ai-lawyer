import AuthForm from "@/components/AuthForm";

export default function GirisPage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Giriş Yap</h1>
      <AuthForm mod="giris" />
    </main>
  );
}
