import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <nav style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
        }}>
          <a href="/" style={{ fontWeight: "bold", textDecoration: "none" }}>AI Hukuki Asistan</a>
          <a href="/giris" style={{ textDecoration: "none" }}>Giriş</a>
          <a href="/hesap" style={{ textDecoration: "none" }}>Hesabım</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
