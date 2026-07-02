"use client";
import { useState } from "react";

export default function SmartForm() {
  const [aciklama, setAciklama] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [alanlar, setAlanlar] = useState<string[]>([]);
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [rizaKabul, setRizaKabul] = useState(false);

  async function getFields() {
    const res = await fetch("/api/form-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aciklama }),
    });
    const data = await res.json();
    setCaseId(data.caseId);
    setAlanlar(data.alanlar);
  }

  async function submit() {
    const ozet = alanlar.map((a) => `${a}: ${degerler[a] ?? ""}`).join("\n");
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, mesaj: ozet }),
    });
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, rizaOnay: true }),
    });
    const data = await res.json();
    setOnizleme(data.onizleme);
    if (data.documentId) setDocumentId(data.documentId);
  }

  async function handleIndir() {
    const r = await fetch("/api/payment/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });
    if (r.status === 401) { window.location.href = "/giris"; return; }
    const d = await r.json();
    if (d.paymentPageUrl) window.location.href = d.paymentPageUrl;
  }

  if (onizleme)
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "0 16px" }}>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{onizleme}</pre>
        <button onClick={handleIndir} style={{ width: "100%", boxSizing: "border-box", fontSize: "1rem", padding: "0.6rem" }}>Tam Belgeyi İndir — 99 TL</button>
      </div>
    );

  if (alanlar.length === 0)
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "0 16px" }}>
        <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Kısaca sorununuz..."
          style={{ width: "100%", boxSizing: "border-box", fontSize: "1rem" }} />
        <button onClick={getFields} style={{ width: "100%", boxSizing: "border-box", fontSize: "1rem", padding: "0.6rem" }}>Devam</button>
      </div>
    );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "0 16px" }}>
      {alanlar.map((a) => (
        <div key={a}>
          <label>{a}</label>
          <input
            value={degerler[a] ?? ""}
            onChange={(e) => setDegerler((d) => ({ ...d, [a]: e.target.value }))}
            style={{ width: "100%", boxSizing: "border-box", fontSize: "1rem" }}
          />
        </div>
      ))}
      <div style={{ margin: "0.5rem 0" }}>
        <label>
          <input
            type="checkbox"
            checked={rizaKabul}
            onChange={(e) => setRizaKabul(e.target.checked)}
          />{" "}
          <a href="/kvkk">KVKK aydınlatma metni</a> ve sorumluluk reddini okudum, kabul ediyorum.
        </label>
      </div>
      <button onClick={submit} disabled={!rizaKabul} style={{ width: "100%", boxSizing: "border-box", fontSize: "1rem", padding: "0.6rem" }}>Belgeyi Oluştur</button>
    </div>
  );
}
