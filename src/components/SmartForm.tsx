"use client";

import { useState } from "react";
import Link from "next/link";
import DocumentPreview from "@/components/DocumentPreview";
import { IconShieldCheck, IconAlertCircle, IconCheck } from "@/components/icons";

export default function SmartForm() {
  const [aciklama, setAciklama] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [belgeTipi, setBelgeTipi] = useState<string | null>(null);
  const [alanlar, setAlanlar] = useState<string[]>([]);
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [rizaKabul, setRizaKabul] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [olusturuluyor, setOlusturuluyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const adim2 = alanlar.length > 0;
  const alanlarDolu = alanlar.every((a) => (degerler[a] ?? "").trim().length > 0);

  async function getFields() {
    if (!aciklama.trim() || yukleniyor) return;
    setHata(null);
    setYukleniyor(true);
    try {
      const res = await fetch("/api/form-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aciklama }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(data?.error ?? "Alanlar hazırlanamadı. Lütfen tekrar deneyin.");
        return;
      }
      setCaseId(data.caseId);
      setAlanlar(data.alanlar ?? []);
      setBelgeTipi(data.belgeTipi ?? null);
    } catch {
      setHata("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  async function submit() {
    if (!rizaKabul || !alanlarDolu || olusturuluyor) return;
    setHata(null);
    setOlusturuluyor(true);
    try {
      const kayitRes = await fetch("/api/form-fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, degerler }),
      });
      if (!kayitRes.ok) {
        const d = await kayitRes.json().catch(() => null);
        setHata(d?.error ?? "Bilgiler kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }
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

  if (onizleme) return <DocumentPreview onizleme={onizleme} documentId={documentId} />;

  return (
    <div>
      {/* Adım göstergesi */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="step-dot" data-active="true">1</span>
          <span className="step-label" data-active="true">Sorununuz</span>
        </div>
        <div className="step-line" />
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="step-dot" data-active={adim2}>2</span>
          <span className="step-label" data-active={adim2}>Belge bilgileri</span>
        </div>
      </div>

      {hata && (
        <div className="banner banner-error" role="alert">
          <span style={{ color: "var(--error)", flexShrink: 0 }}><IconAlertCircle size={19} strokeWidth={1.9} /></span>
          <p><strong>Hata.</strong> {hata}</p>
        </div>
      )}

      {!adim2 && (
        <div className="card" style={{ padding: 26 }}>
          <label className="field-label" htmlFor="aciklama">Sorununuzu kısaca anlatın</label>
          <textarea
            id="aciklama"
            className="textarea"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Kısaca sorununuz..."
            rows={5}
          />
          <button
            onClick={getFields}
            disabled={yukleniyor || !aciklama.trim()}
            data-busy={yukleniyor}
            className="btn btn-primary btn-block btn-cta"
            style={{ marginTop: 18 }}
          >
            {yukleniyor ? "Alanlar hazırlanıyor..." : "Devam"}
          </button>
        </div>
      )}

      {adim2 && (
        <div className="card" style={{ padding: 26 }}>
          <div className="banner-info" style={{ marginBottom: 22 }}>
            <span style={{ color: "var(--success)", display: "flex", flexShrink: 0 }}><IconShieldCheck size={16} strokeWidth={2} /></span>
            <span>
              Yapay zekâ {belgeTipi ? <strong>{belgeTipi}</strong> : "belgeniz"} için gerekli alanları hazırladı.
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {alanlar.map((a) => (
              <div key={a}>
                <label className="field-label" htmlFor={`alan-${a}`}>{a}</label>
                <input
                  id={`alan-${a}`}
                  className="input"
                  value={degerler[a] ?? ""}
                  onChange={(e) => setDegerler((d) => ({ ...d, [a]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <label style={{ display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer", marginTop: 22 }}>
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
            onClick={submit}
            disabled={!rizaKabul || !alanlarDolu || olusturuluyor}
            data-busy={olusturuluyor}
            className="btn btn-primary btn-block btn-cta"
            style={{ marginTop: 18 }}
          >
            {olusturuluyor ? "Belgeniz hazırlanıyor..." : "Belgeyi Oluştur"}
          </button>
        </div>
      )}
    </div>
  );
}
