"use client";
import { useState } from "react";

export default function SmartForm() {
  const [aciklama, setAciklama] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [alanlar, setAlanlar] = useState<string[]>([]);
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const [onizleme, setOnizleme] = useState<string | null>(null);

  async function getFields() {
    const res = await fetch("/api/form-fields", { method: "POST", body: JSON.stringify({ aciklama }) });
    const data = await res.json();
    setCaseId(data.caseId);
    setAlanlar(data.alanlar);
  }

  async function submit() {
    const ozet = alanlar.map((a) => `${a}: ${degerler[a] ?? ""}`).join("\n");
    await fetch("/api/chat", { method: "POST", body: JSON.stringify({ caseId, mesaj: ozet }) });
    const res = await fetch("/api/generate", { method: "POST", body: JSON.stringify({ caseId }) });
    setOnizleme((await res.json()).onizleme);
  }

  if (onizleme) return <pre style={{ whiteSpace: "pre-wrap" }}>{onizleme}</pre>;
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
          <input onChange={(e) => setDegerler((d) => ({ ...d, [a]: e.target.value }))} />
        </div>
      ))}
      <button onClick={submit}>Belgeyi Oluştur</button>
    </div>
  );
}
