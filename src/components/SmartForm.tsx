"use client";
import { useState } from "react";

export default function SmartForm() {
  const [aciklama, setAciklama] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [alanlar, setAlanlar] = useState<string[]>([]);
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const [onizleme, setOnizleme] = useState<string | null>(null);

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
      body: JSON.stringify({ caseId }),
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
      <div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{onizleme}</pre>
        <button onClick={handleIndir}>Tam Belgeyi İndir — 99 TL</button>
      </div>
    );

  if (alanlar.length === 0)
    return (
      <div>
        <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Kısaca sorununuz..." />
        <button onClick={getFields}>Devam</button>
      </div>
    );

  return (
    <div>
      {alanlar.map((a) => (
        <div key={a}>
          <label>{a}</label>
          <input
            value={degerler[a] ?? ""}
            onChange={(e) => setDegerler((d) => ({ ...d, [a]: e.target.value }))}
          />
        </div>
      ))}
      <button onClick={submit}>Belgeyi Oluştur</button>
    </div>
  );
}
