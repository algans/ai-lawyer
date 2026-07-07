"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconScales, IconMenu, IconX } from "@/components/icons";

// Tasarımdaki sabit üst menünün gerçek hâli: oturum durumuna göre
// "Giriş" veya "Hesabım / Çıkış" gösterir, mobilde çalışan bir menü açar.
export default function Header() {
  const [girisYapildi, setGirisYapildi] = useState<boolean | null>(null);
  const [menuAcik, setMenuAcik] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setGirisYapildi(Boolean(d.girisYapildi)))
      .catch(() => setGirisYapildi(false));
  }, []);

  async function cikisYap() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  const kapat = () => setMenuAcik(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo" onClick={kapat}>
          <span className="logo-mark"><IconScales size={21} /></span>
          <span className="logo-text">Hukuki Asistan</span>
        </Link>

        <nav className="nav-desktop" aria-label="Ana menü">
          {girisYapildi === false && (
            <Link href="/giris" className="btn btn-nav">Giriş</Link>
          )}
          {girisYapildi === true && (
            <>
              <Link href="/hesap" className="btn btn-nav">Hesabım</Link>
              <button onClick={cikisYap} className="btn btn-nav">Çıkış</button>
            </>
          )}
          <Link href="/chat" className="btn btn-primary btn-lift">Belge Hazırla</Link>
        </nav>

        <button
          className="hamburger"
          aria-label={menuAcik ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={menuAcik}
          onClick={() => setMenuAcik((a) => !a)}
        >
          {menuAcik ? <IconX size={22} strokeWidth={2} /> : <IconMenu size={22} strokeWidth={2} />}
        </button>
      </div>

      <nav className="mobile-menu" data-open={menuAcik} aria-label="Mobil menü">
        <Link href="/" onClick={kapat}>Ana Sayfa</Link>
        <Link href="/chat" onClick={kapat}>Belge Hazırla</Link>
        <Link href="/form" onClick={kapat}>Adım Adım Form</Link>
        {girisYapildi === true ? (
          <>
            <Link href="/hesap" onClick={kapat}>Hesabım</Link>
            <button onClick={cikisYap}>Çıkış</button>
          </>
        ) : (
          <Link href="/giris" onClick={kapat}>Giriş</Link>
        )}
        <Link href="/kvkk" onClick={kapat}>KVKK Aydınlatma Metni</Link>
      </nav>
    </header>
  );
}
