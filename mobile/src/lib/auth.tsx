import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "./api";
import { getToken, setToken, clearToken } from "./token";
import type { AuthYanit } from "./types";

type AuthDurum = {
  token: string | null;
  girisYapildi: boolean;
  yukleniyor: boolean;
  girisYap: (email: string, parola: string) => Promise<void>;
  kayitOl: (email: string, parola: string, ad?: string) => Promise<void>;
  cikisYap: () => Promise<void>;
};

const Ctx = createContext<AuthDurum | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    getToken().then((t) => {
      setTok(t);
      setYukleniyor(false);
    });
  }, []);

  async function girisYap(email: string, parola: string) {
    const d = await apiFetch<AuthYanit>("/api/auth/login", { method: "POST", body: { email, parola } });
    await setToken(d.token);
    setTok(d.token);
  }
  async function kayitOl(email: string, parola: string, ad?: string) {
    const d = await apiFetch<AuthYanit>("/api/auth/register", { method: "POST", body: { email, parola, ad } });
    await setToken(d.token);
    setTok(d.token);
  }
  async function cikisYap() {
    await clearToken();
    setTok(null);
    apiFetch("/api/auth/logout", { method: "POST", token }).catch(() => {}); // best-effort
  }

  const value = useMemo<AuthDurum>(
    () => ({ token, girisYapildi: token != null, yukleniyor, girisYap, kayitOl, cikisYap }),
    [token, yukleniyor]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthDurum {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth AuthProvider içinde kullanılmalı");
  return v;
}
