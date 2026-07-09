"use client";

import { useState } from "react";
import { BELGE_FIYATI } from "@/lib/pricing";
import { IconLock, IconShield, IconDownload } from "@/components/icons";

interface DocumentPreviewProps {
  onizleme: string;
  documentId: string | null;
}

// Tasarımdaki "Onizleme" bileşeni: maskelenmiş taslak + paywall kartı.
// İçerik sunucuda maskelenir (maskPreview) — görsel karartma sadece süsleme,
// tam metin hiçbir zaman istemciye inmez.
export default function DocumentPreview({ onizleme, documentId }: DocumentPreviewProps) {
  const [yukleniyor, setYukleniyor] = useState<"iyzico" | "stripe" | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function odeVeIndir(saglayici: "iyzico" | "stripe") {
    if (!documentId || yukleniyor) return;
    setYukleniyor(saglayici);
    setHata(null);
    try {
      const r = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, saglayici }),
      });
      if (r.status === 401) {
        window.location.href = "/giris";
        return;
      }
      const d = await r.json();
      if (d.paymentPageUrl) {
        window.location.href = d.paymentPageUrl;
        return;
      }
      setHata(d.error ?? "Ödeme başlatılamadı. Lütfen tekrar deneyin.");
      setYukleniyor(null);
    } catch {
      setHata("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
      setYukleniyor(null);
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 26, color: "var(--ink)", margin: 0 }}>Önizleme</h2>
        <span className="pill pill-locked">
          <IconLock size={14} strokeWidth={2} />
          Taslak — kilitli
        </span>
      </div>

      <div className="doc-card">
        <pre className="doc-body">{onizleme}</pre>

        <div className="paywall-fade" />

        <div className="paywall-card">
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--mint)", color: "var(--green-800)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <IconLock size={22} strokeWidth={2} />
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Belgenin tamamı kilitli</p>
          <p style={{ margin: "0 0 18px", fontSize: 14, lineHeight: 1.5, color: "var(--muted)" }}>
            Ödemeyi tamamlayın, belgenizi PDF ve Word olarak anında indirin.
          </p>
          <button
            onClick={() => odeVeIndir("iyzico")}
            disabled={yukleniyor !== null}
            data-busy={yukleniyor === "iyzico"}
            className="btn btn-primary btn-block btn-cta"
          >
            <IconDownload size={18} strokeWidth={2} />
            {yukleniyor === "iyzico" ? "Yönlendiriliyor..." : `Tam Belgeyi İndir — ${BELGE_FIYATI} TL`}
          </button>
          <button
            onClick={() => odeVeIndir("stripe")}
            disabled={yukleniyor !== null}
            data-busy={yukleniyor === "stripe"}
            className="btn btn-outline btn-block"
            style={{ marginTop: 8 }}
          >
            {yukleniyor === "stripe" ? "Yönlendiriliyor..." : "Kart ile öde (Stripe)"}
          </button>
          {hata && (
            <p role="alert" style={{ margin: "10px 0 0", fontSize: 13.5, color: "var(--error-ink)" }}>{hata}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, color: "var(--muted)", fontSize: 13 }}>
            <IconShield size={14} strokeWidth={2} />
            Güvenli ödeme • iyzico / Stripe
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--faint)" }}>PDF ve Word olarak indir</p>
        </div>
      </div>
    </div>
  );
}
