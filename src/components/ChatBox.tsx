"use client";
import { useState } from "react";

type Msg = { rol: "user" | "assistant"; icerik: string };

export default function ChatBox() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [tamam, setTamam] = useState(false);
  const [onizleme, setOnizleme] = useState<string | null>(null);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input;
    setMsgs((m) => [...m, { rol: "user", icerik: userMsg }]);
    setInput("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, mesaj: userMsg }),
    });
    const data = await res.json();
    setCaseId(data.caseId);
    setMsgs((m) => [...m, { rol: "assistant", icerik: data.cevap }]);
    setTamam(data.tamamlandi);
  }

  async function generate() {
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

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div>
        {msgs.map((m, i) => (
          <p key={i}><strong>{m.rol === "user" ? "Siz" : "Asistan"}:</strong> {m.icerik}</p>
        ))}
      </div>
      {!onizleme && (
        <>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Derdinizi anlatın..." />
          <button onClick={send}>Gönder</button>
          {tamam && <button onClick={generate}>Belgeyi Oluştur</button>}
        </>
      )}
      {onizleme && (
        <div>
          <h3>Önizleme</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{onizleme}</pre>
          <button onClick={handleIndir}>Tam Belgeyi İndir — 99 TL</button>
        </div>
      )}
    </div>
  );
}
