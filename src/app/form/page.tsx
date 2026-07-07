import SmartForm from "@/components/SmartForm";

export default function FormPage() {
  return (
    <main style={{ maxWidth: 660, margin: "0 auto", padding: "32px 22px 64px" }}>
      <h1 className="page-title">Adım Adım Form</h1>
      <p className="page-sub">Kısa bir formla ilerleyin; alanları sizin için hazırlayalım.</p>
      <SmartForm />
    </main>
  );
}
