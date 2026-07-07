"use client";

import { useState } from "react";
import { IconAlertCircle } from "@/components/icons";

interface AuthFormProps {
  mod: "kayit" | "giris";
}

export default function AuthForm({ mod }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [ad, setAd] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const endpoint = mod === "kayit" ? "/api/auth/register" : "/api/auth/login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);

    const body: Record<string, string> = { email, parola };
    if (mod === "kayit" && ad) body.ad = ad;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        window.location.href = "/hesap";
      } else {
        const data = await res.json();
        setHata(data.error ?? "Bir hata oluştu.");
      }
    } catch {
      setHata("Sunucuya bağlanılamadı.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>
      {hata && (
        <div className="banner banner-error" role="alert" style={{ borderRadius: 10, padding: "11px 13px", alignItems: "center", gap: 9 }}>
          <span style={{ color: "var(--error)", display: "flex", flexShrink: 0 }}><IconAlertCircle size={17} strokeWidth={2} /></span>
          <p style={{ fontSize: 14 }}>{hata}</p>
        </div>
      )}
      {mod === "kayit" && (
        <div style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="ad">
            Ad <span style={{ color: "var(--faint)", fontWeight: 400 }}>(isteğe bağlı)</span>
          </label>
          <input
            id="ad"
            className="input"
            type="text"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Adınız"
          />
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label className="field-label" htmlFor="email">E-posta</label>
        <input
          id="email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@eposta.com"
          required
        />
      </div>
      <div style={{ marginBottom: 22 }}>
        <label className="field-label" htmlFor="parola">Parola</label>
        <input
          id="parola"
          className="input"
          type="password"
          value={parola}
          onChange={(e) => setParola(e.target.value)}
          placeholder={mod === "kayit" ? "En az 6 karakter" : "Parolanız"}
          required
        />
      </div>
      <button
        type="submit"
        disabled={yukleniyor}
        data-busy={yukleniyor}
        className="btn btn-primary btn-block btn-cta"
      >
        {yukleniyor ? "Lütfen bekleyin..." : mod === "kayit" ? "Kayıt Ol" : "Giriş Yap"}
      </button>
    </form>
  );
}
