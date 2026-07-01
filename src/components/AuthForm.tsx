"use client";

import { useState } from "react";

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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 400 }}>
      {mod === "kayit" && (
        <div>
          <label htmlFor="ad">Ad (isteğe bağlı)</label>
          <input
            id="ad"
            type="text"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Adınız"
          />
        </div>
      )}
      <div>
        <label htmlFor="email">E-posta</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@eposta.com"
          required
        />
      </div>
      <div>
        <label htmlFor="parola">Parola</label>
        <input
          id="parola"
          type="password"
          value={parola}
          onChange={(e) => setParola(e.target.value)}
          placeholder={mod === "kayit" ? "En az 6 karakter" : "Parolanız"}
          required
        />
      </div>
      {hata && <p style={{ color: "red" }}>{hata}</p>}
      <button type="submit" disabled={yukleniyor}>
        {yukleniyor ? "Lütfen bekleyin..." : mod === "kayit" ? "Kayıt Ol" : "Giriş Yap"}
      </button>
    </form>
  );
}
