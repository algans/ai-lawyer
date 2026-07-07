"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BELGE_FIYATI } from "@/lib/pricing";
import { IconCheckCircle, IconXCircle, IconFile, IconCheck, IconClock, IconDownload } from "@/components/icons";

interface Belge {
  id: string;
  tip: string;
  durum: "taslak" | "odendi";
  createdAt: string;
}

interface Dava {
  id: string;
  baslik: string;
  kategori: string;
  createdAt: string;
  documents: Belge[];
}

function OdemeMesaji() {
  const searchParams = useSearchParams();
  const odemeParam = searchParams.get("odeme");

  if (odemeParam === "basarili")
    return (
      <div className="banner banner-success" style={{ alignItems: "center", marginBottom: 22 }}>
        <span style={{ color: "var(--success)", flexShrink: 0, display: "flex" }}><IconCheckCircle size={20} strokeWidth={2} /></span>
        <p><strong>Ödemeniz başarıyla alındı.</strong> Belgenizi artık indirebilirsiniz.</p>
      </div>
    );

  if (odemeParam === "basarisiz")
    return (
      <div className="banner banner-error" style={{ alignItems: "center", marginBottom: 22 }}>
        <span style={{ color: "var(--error)", flexShrink: 0, display: "flex" }}><IconXCircle size={20} strokeWidth={2} /></span>
        <p><strong>Ödeme işlemi başarısız oldu.</strong> Lütfen tekrar deneyin.</p>
      </div>
    );

  return null;
}

function YuklemeIskeleti() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-label="Yükleniyor">
      {[44, 38].map((w, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 22 }}>
          <div className="skeleton-line" style={{ height: 16, width: `${w}%`, marginBottom: 12 }} />
          <div className="skeleton-line" style={{ height: 12, width: `${w - 16}%`, marginBottom: 20, background: "#F3F7F5" }} />
          <div className="skeleton-block" style={{ height: 64 }} />
        </div>
      ))}
      <p style={{ textAlign: "center", color: "var(--faint)", fontSize: 14, margin: "2px 0 0" }}>Yükleniyor...</p>
    </div>
  );
}

function BosDurum() {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "56px 24px", textAlign: "center" }}>
      <div style={{
        width: 60, height: 60, borderRadius: 15, background: "var(--mint-bg)", color: "var(--green-800)",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
      }}>
        <IconFile size={28} strokeWidth={1.5} />
      </div>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 600, margin: "0 0 8px" }}>
        Henüz hiç belgeniz bulunmuyor.
      </p>
      <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 0 22px" }}>İlk belgenizi oluşturmak için başlayın.</p>
      <Link href="/chat" className="btn btn-primary" style={{ padding: "13px 24px" }}>Belge Hazırla</Link>
    </div>
  );
}

export default function HesapPage() {
  const router = useRouter();
  const [davalar, setDavalar] = useState<Dava[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [odemeYuklen, setOdemeYuklen] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cases")
      .then((res) => {
        if (res.status === 401) {
          router.push("/giris");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setDavalar(data.cases ?? []);
      })
      .catch(() => {
        // Hata durumunda boş liste göster
      })
      .finally(() => setYukleniyor(false));
  }, [router]);

  async function odeVeIndir(belgeId: string) {
    setOdemeYuklen(belgeId);
    setHata(null);
    try {
      const res = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: belgeId }),
      });
      const data = await res.json();
      if (data.paymentPageUrl) {
        window.location.href = data.paymentPageUrl;
        return;
      }
      setHata(data.error ?? "Ödeme başlatılamadı. Lütfen tekrar deneyin.");
      setOdemeYuklen(null);
    } catch {
      setHata("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
      setOdemeYuklen(null);
    }
  }

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "36px 22px 72px" }}>
      <h1 className="page-title" style={{ fontSize: "clamp(26px, 3.2vw, 32px)" }}>Hesabım — Belge Geçmişi</h1>
      <p className="page-sub" style={{ marginBottom: 20 }}>Oluşturduğunuz belgeleri buradan görüntüleyip indirebilirsiniz.</p>

      <Suspense fallback={null}>
        <OdemeMesaji />
      </Suspense>

      {hata && (
        <div className="banner banner-error" role="alert" style={{ alignItems: "center", marginBottom: 22 }}>
          <span style={{ color: "var(--error)", flexShrink: 0, display: "flex" }}><IconXCircle size={20} strokeWidth={2} /></span>
          <p>{hata}</p>
        </div>
      )}

      {yukleniyor && <YuklemeIskeleti />}

      {!yukleniyor && davalar.length === 0 && <BosDurum />}

      {!yukleniyor && davalar.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {davalar.map((dava) => (
            <div key={dava.id} className="card" style={{ padding: 22 }}>
              <div style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: 14, marginBottom: 16 }}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 19, margin: "0 0 3px" }}>{dava.baslik}</h3>
                <p style={{ margin: 0, fontSize: 13.5, color: "var(--faint)" }}>
                  Kategori: {dava.kategori} • {new Date(dava.createdAt).toLocaleDateString("tr-TR")}
                </p>
              </div>

              {dava.documents.length === 0 && (
                <p style={{ margin: 0, color: "var(--faint)", fontSize: 14.5 }}>Bu davada belge yok.</p>
              )}

              {dava.documents.map((belge) => {
                const odendi = belge.durum === "odendi";
                return (
                  <div
                    key={belge.id}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap",
                      background: "#F7FAF8", border: "1px solid var(--border-soft)", borderRadius: 11, padding: "14px 16px",
                      marginTop: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{
                        width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                        background: odendi ? "var(--mint)" : "var(--draft-bg)",
                        color: odendi ? "var(--green-800)" : "var(--draft-ink)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <IconFile size={19} />
                      </span>
                      <div>
                        <p style={{ margin: "0 0 4px", font: "600 15px var(--font-body)" }}>{belge.tip}</p>
                        {odendi ? (
                          <span className="pill pill-paid"><IconCheck size={11} strokeWidth={3} />Ödendi</span>
                        ) : (
                          <span className="pill pill-draft"><IconClock size={11} strokeWidth={2.4} />Taslak</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                      {odendi ? (
                        <>
                          <a href={`/api/document/${belge.id}/download?format=pdf`} className="btn btn-outline">
                            <IconDownload size={15} strokeWidth={1.8} />PDF İndir
                          </a>
                          <a href={`/api/document/${belge.id}/download?format=docx`} className="btn btn-outline">
                            <IconDownload size={15} strokeWidth={1.8} />Word İndir
                          </a>
                        </>
                      ) : (
                        <button
                          onClick={() => odeVeIndir(belge.id)}
                          disabled={odemeYuklen === belge.id}
                          data-busy={odemeYuklen === belge.id}
                          className="btn btn-primary btn-cta"
                          style={{ padding: "10px 16px", fontSize: 14, borderRadius: 9 }}
                        >
                          {odemeYuklen === belge.id ? "Yönlendiriliyor..." : `Öde ve İndir (${BELGE_FIYATI} TL)`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
