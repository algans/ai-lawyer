"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

export default function HesapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [davalar, setDavalar] = useState<Dava[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [odemeYuklen, setOdemeYuklen] = useState<string | null>(null);

  const odemeParam = searchParams.get("odeme");

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

  async function odeVeIndir(belgeid: string) {
    setOdemeYuklen(belgeid);
    try {
      const res = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: belgeid }),
      });
      const data = await res.json();
      if (data.paymentPageUrl) {
        window.location.href = data.paymentPageUrl;
      }
    } catch {
      // Hata durumunda yükleme durumunu sıfırla
    } finally {
      setOdemeYuklen(null);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <h1>Hesabım — Belge Geçmişi</h1>

      {odemeParam === "basarili" && (
        <div
          style={{
            background: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: 4,
            padding: "1rem",
            marginBottom: "1rem",
            color: "#155724",
          }}
        >
          Ödemeniz başarıyla alındı. Belgenizi artık indirebilirsiniz.
        </div>
      )}

      {odemeParam === "basarisiz" && (
        <div
          style={{
            background: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: 4,
            padding: "1rem",
            marginBottom: "1rem",
            color: "#721c24",
          }}
        >
          Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.
        </div>
      )}

      {yukleniyor && <p>Yükleniyor...</p>}

      {!yukleniyor && davalar.length === 0 && (
        <p>Henüz hiç belgeniz bulunmuyor.</p>
      )}

      {davalar.map((dava) => (
        <div
          key={dava.id}
          style={{
            border: "1px solid #dee2e6",
            borderRadius: 4,
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>{dava.baslik}</h2>
          <p style={{ color: "#6c757d", fontSize: "0.9em" }}>
            Kategori: {dava.kategori} &bull;{" "}
            {new Date(dava.createdAt).toLocaleDateString("tr-TR")}
          </p>

          {dava.documents.length === 0 && (
            <p style={{ color: "#6c757d" }}>Bu davada belge yok.</p>
          )}

          {dava.documents.map((belge) => (
            <div
              key={belge.id}
              style={{
                background: "#f8f9fa",
                borderRadius: 4,
                padding: "0.75rem",
                marginTop: "0.5rem",
              }}
            >
              <p style={{ margin: "0 0 0.5rem 0" }}>
                <strong>{belge.tip}</strong> —{" "}
                <span
                  style={{
                    color: belge.durum === "odendi" ? "#28a745" : "#ffc107",
                    fontWeight: "bold",
                  }}
                >
                  {belge.durum === "odendi" ? "Ödendi" : "Taslak"}
                </span>
              </p>
              <p style={{ margin: "0 0 0.5rem 0", color: "#6c757d", fontSize: "0.85em" }}>
                {new Date(belge.createdAt).toLocaleDateString("tr-TR")}
              </p>

              {belge.durum === "odendi" ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <a
                    href={`/api/document/${belge.id}/download?format=pdf`}
                    style={{
                      padding: "0.4rem 0.8rem",
                      background: "#dc3545",
                      color: "#fff",
                      borderRadius: 4,
                      textDecoration: "none",
                      fontSize: "0.9em",
                    }}
                  >
                    PDF İndir
                  </a>
                  <a
                    href={`/api/document/${belge.id}/download?format=docx`}
                    style={{
                      padding: "0.4rem 0.8rem",
                      background: "#0d6efd",
                      color: "#fff",
                      borderRadius: 4,
                      textDecoration: "none",
                      fontSize: "0.9em",
                    }}
                  >
                    Word İndir
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => odeVeIndir(belge.id)}
                  disabled={odemeYuklen === belge.id}
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: odemeYuklen === belge.id ? "not-allowed" : "pointer",
                    fontSize: "0.9em",
                  }}
                >
                  {odemeYuklen === belge.id ? "Yönlendiriliyor..." : "Öde ve İndir (99 TL)"}
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
