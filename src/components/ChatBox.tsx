"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import DocumentPreview from "@/components/DocumentPreview";
import { IconScales, IconAlertCircle, IconSend, IconCheck } from "@/components/icons";

type Msg = { rol: "user" | "assistant"; icerik: string };

export default function ChatBox() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [tamam, setTamam] = useState(false);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [rizaKabul, setRizaKabul] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [olusturuluyor, setOlusturuluyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const sonMesajRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sonMesajRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, gonderiliyor, onizleme]);

  async function send() {
    const mesaj = input.trim();
    if (!mesaj || gonderiliyor) return;
    setHata(null);
    setMsgs((m) => [...m, { rol: "user", icerik: mesaj }]);
    setInput("");
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // caseId null iken alanı hiç gönderme: API şeması z.string().optional() — null'u reddeder
        body: JSON.stringify(caseId ? { caseId, mesaj } : { mesaj }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(data?.error ?? "Bir hata oluştu. Lütfen tekrar deneyin.");
        return;
      }
      setCaseId(data.caseId);
      setMsgs((m) => [...m, { rol: "assistant", icerik: data.cevap }]);
      setTamam(data.tamamlandi);
    } catch {
      setHata("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setGonderiliyor(false);
    }
  }

  async function generate() {
    if (!rizaKabul || olusturuluyor) return;
    setHata(null);
    setOlusturuluyor(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, rizaOnay: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(data?.error ?? "Belge oluşturulamadı. Lütfen tekrar deneyin.");
        return;
      }
      setOnizleme(data.onizleme);
      if (data.documentId) setDocumentId(data.documentId);
    } catch {
      setHata("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setOlusturuluyor(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "70vh" }}>
      {hata && (
        <div className="banner banner-error" role="alert">
          <span style={{ color: "var(--error)", flexShrink: 0 }}><IconAlertCircle size={19} strokeWidth={1.9} /></span>
          <p><strong>Hata.</strong> {hata}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {msgs.map((m, i) =>
          m.rol === "user" ? (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ maxWidth: "82%" }}>
                <div className="bubble-label" style={{ textAlign: "right" }}>Siz</div>
                <div className="bubble-user">{m.icerik}</div>
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: "flex", justifyContent: "flex-start", gap: 10, alignItems: "flex-start" }} data-testid="ai-response">
              <span className="avatar" style={{ marginTop: 16 }}><IconScales size={16} /></span>
              <div style={{ maxWidth: "82%" }}>
                <div className="bubble-label">Asistan</div>
                <div className="bubble-assistant">{m.icerik}</div>
              </div>
            </div>
          )
        )}

        {gonderiliyor && (
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, alignItems: "center" }} aria-label="Asistan yazıyor">
            <span className="avatar"><IconScales size={16} /></span>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 5 }}>
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: ".2s" }} />
              <span className="typing-dot" style={{ animationDelay: ".4s" }} />
            </div>
          </div>
        )}
        <div ref={sonMesajRef} />
      </div>

      {/* Rıza + belge oluştur */}
      {!onizleme && tamam && (
        <div className="card" style={{ padding: 20, marginTop: 22 }}>
          <label style={{ display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer" }}>
            <button
              type="button"
              role="checkbox"
              aria-checked={rizaKabul}
              className="check"
              data-on={rizaKabul}
              onClick={() => setRizaKabul((r) => !r)}
            >
              {rizaKabul && <IconCheck size={14} strokeWidth={3} />}
            </button>
            <span
              onClick={() => setRizaKabul((r) => !r)}
              style={{ fontSize: 14.5, lineHeight: 1.55, color: "#3f524a" }}
            >
              <Link href="/kvkk" onClick={(e) => e.stopPropagation()} style={{ color: "var(--green-600)", fontWeight: 600, textDecoration: "none" }}>
                KVKK aydınlatma metni
              </Link>{" "}
              ve sorumluluk reddini okudum, kabul ediyorum.
            </span>
          </label>
          <button
            onClick={generate}
            disabled={!rizaKabul || olusturuluyor}
            data-busy={olusturuluyor}
            className="btn btn-primary btn-block btn-cta"
            style={{ marginTop: 18 }}
          >
            {olusturuluyor ? "Belgeniz hazırlanıyor..." : "Belgeyi Oluştur"}
          </button>
        </div>
      )}

      {onizleme && (
        <div style={{ marginTop: 28 }}>
          <DocumentPreview onizleme={onizleme} documentId={documentId} />
        </div>
      )}

      {/* Yapışkan giriş satırı */}
      {!onizleme && (
        <div style={{
          position: "sticky", bottom: 0,
          background: "linear-gradient(180deg, rgba(246,249,247,0), var(--bg) 26%)",
          padding: "18px 0 22px", marginTop: "auto",
        }}>
          <div className="chat-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
              placeholder="Derdinizi anlatın..."
              aria-label="Mesajınız"
            />
            <button onClick={send} disabled={gonderiliyor} className="btn btn-primary" style={{ padding: "12px 20px", flexShrink: 0 }}>
              Gönder
              <IconSend size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
