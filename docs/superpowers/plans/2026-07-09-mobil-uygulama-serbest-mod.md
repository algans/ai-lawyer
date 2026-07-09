# Mobil Uygulama (Serbest Mod MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web'deki hukuki belge asistanının serbest (sohbet) modunu, önizlemeye kadar uçtan uca çalışan bir Expo (React Native) uygulaması olarak inşa etmek.

**Architecture:** Mobil, mevcut Next.js REST API'nin ince istemcisidir; kendi backend'i yoktur. Tek backend değişikliği geriye dönük uyumludur: `oturumCurrentUser`'a `Authorization: Bearer` desteği + login/register yanıtında `token`. Mobil, JWT'yi `expo-secure-store`'da saklar ve isteklere Bearer olarak ekler. Ödeme sağlayıcının web checkout'unda (in-app tarayıcı) yapılır; indirme native.

**Tech Stack:** Expo (managed) + Expo Router · TypeScript · @expo-google-fonts (Inter/Lora) · @expo/vector-icons (Feather) · expo-secure-store · expo-web-browser · expo-file-system · expo-sharing · jest-expo. Backend: Next.js 15 API + vitest.

## Global Constraints

- **Tasarım yönü: Versiyon B (native)** — yeşil başlık (`#0A2C21`) + altın alt çizgi, alt sekme çubuğu (Sohbet · Belgelerim · Hesap), mint tonlu asistan balonları, bottom-sheet paywall.
- **Palet ve tipografi web ile birebir** (`src/app/globals.css` tokenları): Inter (gövde), Lora (başlık); yeşil/mint/altın palet. Renk sabitleri Task 4'te tanımlı.
- **Tüm kütüphaneler Expo Go uyumlu** — özel/harici native modül YOK (`@gorhom/bottom-sheet`, `reanimated` kullanılmaz; bottom sheet RN `Modal`+`Animated` ile).
- **Paywall invariant'ı sunucuda** — mobil tam metni asla göstermez; yalnızca `generate`'ten gelen maskeli `onizleme` ve `odendi` sonrası `download`.
- **Backend değişikliği geriye dönük uyumlu** — web cookie akışı bozulmamalı; `npm test` (mevcut 169+) yeşil kalmalı.
- **API tabanı:** `EXPO_PUBLIC_API_URL` ?? `https://ai-hukuki-asistan.fly.dev` (deploy anında gerçek URL teyit edilecek).
- **Tüm kullanıcıya görünen metin Türkçe**; alan/enum adları Türkçe (`caseId`, `cevap`, `tamamlandi`, `durum: taslak|odendi`).
- **Backend testleri Docker'da:** `docker compose -f docker-compose.dev.yml run --rm app npm test`.
- **Mobil komutları host'ta** `mobile/` içinde çalışır (Expo backend Docker'ında koşmaz).

---

## Dosya Yapısı

**Backend (değişen):**
- `src/lib/auth.ts` — `oturumCurrentUser`'a Bearer fallback (Modify)
- `src/lib/auth.test.ts` — Bearer testleri (Modify)
- `src/app/api/auth/login/route.ts` — yanıta `token` (Modify)
- `src/app/api/auth/login/route.test.ts` — token testi (Modify)
- `src/app/api/auth/register/route.ts` — yanıta `token` (Modify)
- `src/app/api/auth/register/route.test.ts` — token testi (Modify)
- `.dockerignore` — `mobile/` hariç tut (Modify)

**Mobil (yeni, hepsi `mobile/` altında):**
- `app/_layout.tsx` — fontlar + AuthProvider + kök Stack
- `app/(tabs)/_layout.tsx` — alt sekme navigasyonu
- `app/(tabs)/index.tsx` — Sohbet ekranı
- `app/(tabs)/belgelerim.tsx` — vaka listesi
- `app/(tabs)/hesap.tsx` — hesap/çıkış
- `app/onizleme/[documentId].tsx` — önizleme + paywall
- `app/giris.tsx`, `app/kayit.tsx` — auth ekranları
- `lib/config.ts` — API_URL
- `lib/types.ts` — API tipleri
- `lib/api.ts` — fetch sarmalayıcı
- `lib/token.ts` — SecureStore token saklama
- `lib/auth.tsx` — AuthContext
- `lib/theme.ts` — tasarım tokenları
- `lib/preview-cache.ts` — documentId→onizleme geçici cache
- `components/` — Button, Field, Banner, GreenHeader, ChatBubble, TypingDots, RizaOnay, DocPreview, PaywallSheet
- `__tests__/` — `api.test.ts`, `token.test.ts`
- `app.config.ts`, `package.json`, `tsconfig.json`, `jest.config.js`, `.gitignore`

---

## Phase 0 — Backend Token Auth (TDD, Docker)

### Task 1: `oturumCurrentUser`'a Bearer desteği

**Files:**
- Modify: `src/lib/auth.ts:50-52`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Produces: `oturumCurrentUser(req: NextRequest): Promise<{ userId: string } | null>` — cookie yoksa `Authorization: Bearer <jwt>` başlığını dener. Davranış geriye dönük uyumlu.

- [ ] **Step 1: Write the failing tests** — `src/lib/auth.test.ts` sonuna, dosya başına `import { NextRequest } from "next/server";` ve `oturumCurrentUser` importunu ekleyerek:

```ts
// (dosya başındaki import satırını güncelle)
import { hashParola, dogrulaParola, oturumTokeni, oturumDogrula, oturumCurrentUser } from "./auth";
import { NextRequest } from "next/server";

// (describe("auth", ...) içine ekle)
  it("oturumCurrentUser: Bearer başlığındaki geçerli token'ı çözer (cookie yokken)", async () => {
    const t = await oturumTokeni("user-9");
    const req = new NextRequest("http://t/api/x", { headers: { authorization: `Bearer ${t}` } });
    expect(await oturumCurrentUser(req)).toEqual({ userId: "user-9" });
  });
  it("oturumCurrentUser: cookie geçerliyse Bearer'a bakmadan onu kullanır (geriye uyumluluk)", async () => {
    const t = await oturumTokeni("user-cookie");
    const req = new NextRequest("http://t/api/x", { headers: { cookie: `oturum=${t}` } });
    expect(await oturumCurrentUser(req)).toEqual({ userId: "user-cookie" });
  });
  it("oturumCurrentUser: geçersiz Bearer için null döner", async () => {
    const req = new NextRequest("http://t/api/x", { headers: { authorization: "Bearer bozuk.token.xyz" } });
    expect(await oturumCurrentUser(req)).toBeNull();
  });
  it("oturumCurrentUser: ne cookie ne Bearer varsa null döner", async () => {
    const req = new NextRequest("http://t/api/x");
    expect(await oturumCurrentUser(req)).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- auth`
Expected: FAIL — Bearer testleri (cookie yokken null döndüğü için) kırılır.

- [ ] **Step 3: Implement** — `src/lib/auth.ts` içindeki `oturumCurrentUser`'ı değiştir:

```ts
export async function oturumCurrentUser(req: NextRequest): Promise<{ userId: string } | null> {
  // Web: httpOnly cookie. Mobil: cookie taşıyamaz → Authorization: Bearer <jwt>.
  const cookieToken = req.cookies.get(COOKIE_ADI)?.value;
  if (cookieToken) {
    const oturum = await oturumDogrula(cookieToken);
    if (oturum) return oturum;
  }
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  return oturumDogrula(bearer);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- auth`
Expected: PASS (tüm auth testleri).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat(auth): oturumCurrentUser'a Bearer token desteği (mobil, geriye uyumlu)"
```

---

### Task 2: login + register yanıtında `token`

**Files:**
- Modify: `src/app/api/auth/login/route.ts:27`, `src/app/api/auth/register/route.ts:26`
- Test: `src/app/api/auth/login/route.test.ts`, `src/app/api/auth/register/route.test.ts`

**Interfaces:**
- Produces: `POST /api/auth/login` → `{ userId, token }`; `POST /api/auth/register` → `{ userId, token }` (201). Cookie ayarı korunur.

- [ ] **Step 1: Write failing tests** — login testine ekle:

```ts
  it("başarılı girişte yanıt gövdesinde token döner (mobil istemci için)", async () => {
    findUnique.mockResolvedValue({ id: "u1", parolaHash: DOGRU_HASH });
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", parola: DOGRU_PAROLA }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(typeof body.token).toBe("string");
    expect(body.token.split(".")).toHaveLength(3); // JWT: header.payload.signature
  });
```

register testine (`src/app/api/auth/register/route.test.ts`) benzer bir test ekle — kayıt başarılı senaryosunda `expect(typeof body.token).toBe("string")` ve `body.token.split(".")` uzunluğu 3.

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- auth/login auth/register`
Expected: FAIL — `body.token` undefined.

- [ ] **Step 3: Implement**

`src/app/api/auth/login/route.ts` — `oturumTokeni` çağrısını bir değişkende topla ve gövdeye ekle:

```ts
  const token = await oturumTokeni(user.id);
  const res = NextResponse.json({ userId: user.id, token });
  res.cookies.set(COOKIE_ADI, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
```

`src/app/api/auth/register/route.ts` — aynı desen:

```ts
  const user = await prisma.user.create({ data: { email, ad, parolaHash: await hashParola(parola) } });
  const token = await oturumTokeni(user.id);
  const res = NextResponse.json({ userId: user.id, token }, { status: 201 });
  res.cookies.set(COOKIE_ADI, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose -f docker-compose.dev.yml run --rm app npm test`
Expected: PASS — tüm suite (169+ test) yeşil (DB için önce `docker compose -f docker-compose.dev.yml up -d db`).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/login/route.ts src/app/api/auth/login/route.test.ts src/app/api/auth/register/route.ts src/app/api/auth/register/route.test.ts
git commit -m "feat(auth): login/register yanıtına token ekle (mobil SecureStore için)"
```

---

## Phase 1 — Mobil Scaffold & Konfig

### Task 3: Expo projesini oluştur + ignore

**Files:**
- Create: `mobile/` (Expo Router TypeScript şablonu), `mobile/app.config.ts`, `mobile/.gitignore`
- Modify: `.dockerignore`

- [ ] **Step 1: Scaffold**

Run:
```bash
npx create-expo-app@latest mobile -t expo-router
cd mobile && npx expo install expo-secure-store expo-web-browser expo-file-system expo-sharing expo-font @expo-google-fonts/inter @expo-google-fonts/lora
npm install -D jest-expo jest @testing-library/react-native @types/jest react-test-renderer
```
Expected: `mobile/` içinde çalışan bir Expo Router projesi; bağımlılıklar kurulu.

> Ağ kısıtı nedeniyle `create-expo-app` çalışmazsa: `mobile/package.json`'ı elle oluştur (aşağıdaki bağımlılıklar), `npx expo install --fix` ile SDK'ya uygun sürümleri çöz.

- [ ] **Step 2: `app.config.ts` — API tabanı**

```ts
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Hukuki Asistan",
  slug: "hukuki-asistan-mobil",
  scheme: "hukukiasistan",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  splash: { backgroundColor: "#0A2C21", resizeMode: "contain" },
  ios: { supportsTablet: true },
  android: { adaptiveIcon: { backgroundColor: "#0A2C21" } },
  plugins: ["expo-router", "expo-secure-store"],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://ai-hukuki-asistan.fly.dev",
  },
};

export default config;
```
(Varsa şablonun `app.json`'ını sil; tek kaynak `app.config.ts` olsun.)

- [ ] **Step 3: `.dockerignore`'a ekle** — backend imajı `mobile/` içermesin. Dosyanın sonuna:

```
# Mobil Expo projesi backend imajına dahil edilmez
mobile
```

- [ ] **Step 4: `mobile/.gitignore`** (şablon üretmediyse):

```
node_modules/
.expo/
dist/
*.log
.DS_Store
```

- [ ] **Step 5: Commit**

```bash
git add mobile .dockerignore
git commit -m "chore(mobil): Expo Router projesi scaffold + config + dockerignore"
```

---

### Task 4: Tasarım tokenları (`lib/theme.ts`) + font yükleme

**Files:**
- Create: `mobile/lib/theme.ts`
- Modify: `mobile/app/_layout.tsx` (fontlar — Task 8'de tamamlanır; burada tokenlar)

**Interfaces:**
- Produces: `renk` (renk sabitleri objesi), `bosluk`, `radius`, `fontAilesi` (`{ govde: "Inter_400Regular", govdeKalin: "Inter_600SemiBold", baslik: "Lora_600SemiBold" }`).

- [ ] **Step 1: `mobile/lib/theme.ts`**

```ts
// Web'deki src/app/globals.css tokenlarının birebir portu.
export const renk = {
  bg: "#F6F9F7",
  ink: "#0F1E17",
  muted: "#5A6B63",
  faint: "#8A9790",
  border: "#DCE7E1",
  borderSoft: "#EDF3F0",
  green900: "#0A2C21",
  green800: "#0E3B2E",
  green700: "#14513D",
  green600: "#1B6B4C",
  green500: "#22855E",
  mint: "#E7F1EC",
  mintSoft: "#EEF4F0",
  mintBg: "#F2F8F5",
  gold: "#C6A15B",
  goldLight: "#E7CE97",
  success: "#12855A",
  successBg: "#EAF6EF",
  error: "#B42318",
  errorInk: "#8A231B",
  errorBg: "#FCEDEC",
  draftBg: "#FBF3E1",
  draftInk: "#B07A12",
  white: "#FFFFFF",
} as const;

export const bosluk = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const fontAilesi = {
  govde: "Inter_400Regular",
  govdeOrta: "Inter_500Medium",
  govdeKalin: "Inter_600SemiBold",
  baslik: "Lora_600SemiBold",
} as const;
```

- [ ] **Step 2: Manuel doğrulama** — `mobile/` içinde `npx tsc --noEmit` çalıştır; `theme.ts` tip hatasız derlenmeli.

Run: `cd mobile && npx tsc --noEmit`
Expected: theme.ts kaynaklı hata yok.

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/theme.ts
git commit -m "feat(mobil): tasarım tokenları (globals.css portu)"
```

---

## Phase 2 — Mobil Çekirdek Lib (TDD, jest-expo)

### Task 5: `lib/config.ts` + `lib/types.ts` + `lib/api.ts` (+ jest kurulumu)

**Files:**
- Create: `mobile/lib/config.ts`, `mobile/lib/types.ts`, `mobile/lib/api.ts`, `mobile/jest.config.js`
- Test: `mobile/__tests__/api.test.ts`
- Modify: `mobile/package.json` (test script)

**Interfaces:**
- Produces:
  - `API_URL: string`
  - `apiFetch<T>(path: string, opts?: { method?: string; body?: unknown; token?: string | null }): Promise<T>` — JSON döndürür; `!res.ok` ise `{ status, message }` (ApiError) fırlatır.
  - Tipler: `ChatYanit`, `GenerateYanit`, `PaymentInitYanit`, `AuthYanit`, `CasesYanit`, `Case`, `Msg`.

- [ ] **Step 1: `mobile/jest.config.js`**

```js
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))",
  ],
};
```

`mobile/package.json` scripts'ine ekle: `"test": "jest"`.

- [ ] **Step 2: `mobile/lib/config.ts`**

```ts
import Constants from "expo-constants";

export const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://ai-hukuki-asistan.fly.dev";
```

- [ ] **Step 3: `mobile/lib/types.ts`**

```ts
export type Msg = { rol: "user" | "assistant"; icerik: string };

export type ChatYanit = { caseId: string; cevap: string; tamamlandi: boolean };
export type GenerateYanit = { documentId: string; onizleme: string };
export type PaymentInitYanit = { paymentPageUrl: string };
export type AuthYanit = { userId: string; token: string };

export type BelgeOzet = { id: string; tip: string; durum: "taslak" | "odendi"; createdAt: string };
export type Case = {
  id: string;
  baslik: string;
  kategori: string;
  createdAt: string;
  documents: BelgeOzet[];
};
export type CasesYanit = { cases: Case[] };
```

- [ ] **Step 4: Write failing test** — `mobile/__tests__/api.test.ts`:

```ts
import { apiFetch } from "../lib/api";

jest.mock("expo-constants", () => ({ expoConfig: { extra: { apiUrl: "https://test.local" } } }));

describe("apiFetch", () => {
  afterEach(() => jest.restoreAllMocks());

  it("başarılı yanıtta JSON gövdesini döndürür ve Bearer ekler", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch" as any)
      .mockResolvedValue({ ok: true, json: async () => ({ caseId: "c1" }) } as any);
    const data = await apiFetch<{ caseId: string }>("/api/chat", {
      method: "POST",
      body: { mesaj: "selam" },
      token: "abc",
    });
    expect(data.caseId).toBe("c1");
    const [url, init] = fetchMock.mock.calls[0] as [string, any];
    expect(url).toBe("https://test.local/api/chat");
    expect(init.headers.Authorization).toBe("Bearer abc");
    expect(JSON.parse(init.body)).toEqual({ mesaj: "selam" });
  });

  it("hata yanıtında { status, message } fırlatır (server error alanını kullanır)", async () => {
    jest.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: false, status: 404, json: async () => ({ error: "Vaka bulunamadı" }),
    } as any);
    await expect(apiFetch("/api/generate", { method: "POST" })).rejects.toMatchObject({
      status: 404, message: "Vaka bulunamadı",
    });
  });

  it("token yoksa Authorization başlığı eklenmez", async () => {
    const fetchMock = jest.spyOn(global, "fetch" as any)
      .mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    await apiFetch("/api/health");
    const [, init] = fetchMock.mock.calls[0] as [string, any];
    expect(init.headers.Authorization).toBeUndefined();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd mobile && npm test -- api`
Expected: FAIL — `lib/api.ts` yok.

- [ ] **Step 6: Implement `mobile/lib/api.ts`**

```ts
import { API_URL } from "./config";

export type ApiError = { status: number; message: string };

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const { method = "GET", body, token } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message: string =
      (data && (data.error || data.message)) || "Bir hata oluştu. Lütfen tekrar deneyin.";
    throw { status: res.status, message } as ApiError;
  }
  return data as T;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd mobile && npm test -- api`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add mobile/lib/config.ts mobile/lib/types.ts mobile/lib/api.ts mobile/jest.config.js mobile/__tests__/api.test.ts mobile/package.json
git commit -m "feat(mobil): API fetch sarmalayıcı + tipler + jest kurulumu"
```

---

### Task 6: `lib/token.ts` (SecureStore) + `lib/auth.tsx` (AuthContext)

**Files:**
- Create: `mobile/lib/token.ts`, `mobile/lib/auth.tsx`
- Test: `mobile/__tests__/token.test.ts`

**Interfaces:**
- Produces:
  - `getToken(): Promise<string | null>`, `setToken(t: string): Promise<void>`, `clearToken(): Promise<void>` (anahtar: `"oturum_token"`).
  - `AuthProvider` (React bileşeni), `useAuth()` → `{ token, girisYapildi, yukleniyor, girisYap(email,parola), kayitOl(email,parola,ad?), cikisYap() }`.

- [ ] **Step 1: Write failing test** — `mobile/__tests__/token.test.ts`:

```ts
import { getToken, setToken, clearToken } from "../lib/token";

const store: Record<string, string> = {};
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { store[k] = v; }),
  deleteItemAsync: jest.fn(async (k: string) => { delete store[k]; }),
}));

describe("token store", () => {
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

  it("set → get round-trip", async () => {
    await setToken("jwt-123");
    expect(await getToken()).toBe("jwt-123");
  });
  it("clear siler", async () => {
    await setToken("jwt-123");
    await clearToken();
    expect(await getToken()).toBeNull();
  });
  it("hiç yazılmadıysa null döner", async () => {
    expect(await getToken()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npm test -- token`
Expected: FAIL — `lib/token.ts` yok.

- [ ] **Step 3: Implement `mobile/lib/token.ts`**

```ts
import * as SecureStore from "expo-secure-store";

const ANAHTAR = "oturum_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ANAHTAR);
}
export async function setToken(t: string): Promise<void> {
  await SecureStore.setItemAsync(ANAHTAR, t);
}
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ANAHTAR);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npm test -- token`
Expected: PASS.

- [ ] **Step 5: Implement `mobile/lib/auth.tsx`** (context; manuel doğrulanır)

```tsx
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
    getToken().then((t) => { setTok(t); setYukleniyor(false); });
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
    apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {}); // best-effort
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
```

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/token.ts mobile/lib/auth.tsx mobile/__tests__/token.test.ts
git commit -m "feat(mobil): SecureStore token saklama + AuthContext"
```

---

## Phase 3 — UI Kit & Navigasyon

### Task 7: Paylaşılan bileşenler

**Files:**
- Create: `mobile/components/Button.tsx`, `Field.tsx`, `Banner.tsx`, `GreenHeader.tsx`, `ChatBubble.tsx`, `TypingDots.tsx`

**Interfaces:**
- Produces:
  - `<Button label onPress disabled? busy? variant?("primary"|"ghost") />`
  - `<Field label value onChangeText placeholder? secureTextEntry? keyboardType? />`
  - `<Banner tur("error"|"warn") mesaj />`
  - `<GreenHeader baslik altMetin? sol? sag? />` (yeşil başlık + altın alt çizgi)
  - `<ChatBubble rol icerik />` (assistant: mint + terazi avatarı; user: yeşil, sağ)
  - `<TypingDots />` (üç noktalı "yazıyor" animasyonu)

- [ ] **Step 1: `mobile/components/Button.tsx`**

```tsx
import { Pressable, Text, ActivityIndicator, StyleSheet, type ViewStyle } from "react-native";
import { renk, radius, fontAilesi } from "../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "ghost";
  style?: ViewStyle;
};

export default function Button({ label, onPress, disabled, busy, variant = "primary", style }: Props) {
  const ghost = variant === "ghost";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        s.base,
        ghost ? s.ghost : s.primary,
        (disabled || busy) && s.disabled,
        pressed && !disabled && !busy && { opacity: 0.9 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={ghost ? renk.green700 : renk.white} />
      ) : (
        <Text style={[s.label, ghost ? s.labelGhost : s.labelPrimary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { minHeight: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, flexDirection: "row" },
  primary: { backgroundColor: renk.green600 },
  ghost: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fontAilesi.govdeKalin, fontSize: 16 },
  labelPrimary: { color: renk.white },
  labelGhost: { color: renk.green800 },
});
```

- [ ] **Step 2: `mobile/components/Field.tsx`**

```tsx
import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions } from "react-native";
import { renk, radius, fontAilesi } from "../lib/theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences";
};

export default function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = "none" }: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={renk.faint}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: fontAilesi.govdeKalin, fontSize: 14, color: renk.ink, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: renk.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontAilesi.govde, fontSize: 16, color: renk.ink, backgroundColor: renk.white },
});
```

- [ ] **Step 3: `mobile/components/Banner.tsx`**

```tsx
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius, fontAilesi } from "../lib/theme";

export default function Banner({ tur, mesaj }: { tur: "error" | "warn"; mesaj: string }) {
  const hata = tur === "error";
  return (
    <View style={[s.wrap, { backgroundColor: hata ? renk.errorBg : renk.draftBg }]}>
      <Feather name={hata ? "alert-circle" : "alert-triangle"} size={18} color={hata ? renk.error : renk.draftInk} />
      <Text style={[s.text, { color: hata ? renk.errorInk : renk.draftInk }]}>{mesaj}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 13, borderRadius: radius.md, marginBottom: 14 },
  text: { flex: 1, fontFamily: fontAilesi.govde, fontSize: 13.5, lineHeight: 20 },
});
```

- [ ] **Step 4: `mobile/components/GreenHeader.tsx`**

```tsx
import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { renk, fontAilesi } from "../lib/theme";

type Props = { baslik: string; altMetin?: string; sol?: ReactNode; sag?: ReactNode };

export default function GreenHeader({ baslik, altMetin, sol, sag }: Props) {
  return (
    <View style={s.wrap}>
      {(sol || sag) && (
        <View style={s.row}>
          <View>{sol}</View>
          <View>{sag}</View>
        </View>
      )}
      <Text style={s.baslik}>{baslik}</Text>
      {altMetin ? <Text style={s.alt}>{altMetin}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: renk.green900, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: renk.gold },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  baslik: { fontFamily: fontAilesi.baslik, fontSize: 22, color: renk.white },
  alt: { fontFamily: fontAilesi.govde, fontSize: 13, color: "#BCD3C9", marginTop: 3 },
});
```

> Not: `type ReactNode` importu `react-native`'den değil `react`'ten gelmeli — implementasyonda `import type { ReactNode } from "react";` kullan.

- [ ] **Step 5: `mobile/components/ChatBubble.tsx`**

```tsx
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius, fontAilesi } from "../lib/theme";
import type { Msg } from "../lib/types";

export default function ChatBubble({ rol, icerik }: Msg) {
  if (rol === "user") {
    return (
      <View style={s.userRow}>
        <View style={s.userBubble}>
          <Text style={s.userText}>{icerik}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={s.aiRow}>
      <View style={s.avatar}>
        <Feather name="feather" size={15} color={renk.white} />
      </View>
      <View style={s.aiBubble}>
        <Text style={s.aiText}>{icerik}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  userRow: { flexDirection: "row", justifyContent: "flex-end", marginVertical: 6 },
  aiRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginVertical: 6 },
  avatar: { width: 30, height: 30, borderRadius: 9, backgroundColor: renk.green800, alignItems: "center", justifyContent: "center" },
  userBubble: { maxWidth: "82%", backgroundColor: renk.green600, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 13 },
  aiBubble: { maxWidth: "82%", backgroundColor: renk.mintBg, borderWidth: 1, borderColor: "#D8E8DF", borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 13 },
  userText: { color: renk.white, fontFamily: fontAilesi.govde, fontSize: 15, lineHeight: 22 },
  aiText: { color: "#24352D", fontFamily: fontAilesi.govde, fontSize: 15, lineHeight: 22 },
});
```

- [ ] **Step 6: `mobile/components/TypingDots.tsx`**

```tsx
import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius } from "../lib/theme";

function Dot({ gecikme }: { gecikme: number }) {
  const o = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 400, delay: gecikme, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [o, gecikme]);
  return <Animated.View style={[s.dot, { opacity: o }]} />;
}

export default function TypingDots() {
  return (
    <View style={s.row}>
      <View style={s.avatar}><Feather name="feather" size={15} color={renk.white} /></View>
      <View style={s.bubble}><Dot gecikme={0} /><Dot gecikme={200} /><Dot gecikme={400} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginVertical: 6 },
  avatar: { width: 30, height: 30, borderRadius: 9, backgroundColor: renk.green800, alignItems: "center", justifyContent: "center" },
  bubble: { flexDirection: "row", gap: 5, backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: renk.green500 },
});
```

- [ ] **Step 7: Typecheck + Commit**

Run: `cd mobile && npx tsc --noEmit`
Expected: bu bileşenlerden kaynaklı hata yok.

```bash
git add mobile/components
git commit -m "feat(mobil): paylaşılan UI bileşenleri (Button, Field, Banner, ChatBubble, TypingDots, GreenHeader)"
```

---

### Task 8: Kök layout + fontlar + sekme navigasyonu

**Files:**
- Create/Modify: `mobile/app/_layout.tsx`, `mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `AuthProvider` (Task 6), `fontAilesi` (Task 4).
- Produces: Fontlar yüklenene dek splash; `(tabs)` grubu 3 sekme; kök Stack `onizleme/[documentId]`, `giris`, `kayit` modal ekranlarını içerir.

- [ ] **Step 1: `mobile/app/_layout.tsx`**

```tsx
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Lora_600SemiBold } from "@expo-google-fonts/lora";
import { Stack } from "expo-router";
import { View } from "react-native";
import { AuthProvider } from "../lib/auth";
import { renk } from "../lib/theme";

export default function RootLayout() {
  const [fontHazir] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Lora_600SemiBold,
  });
  if (!fontHazir) return <View style={{ flex: 1, backgroundColor: renk.green900 }} />;

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: renk.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onizleme/[documentId]" options={{ presentation: "card" }} />
        <Stack.Screen name="giris" options={{ presentation: "modal" }} />
        <Stack.Screen name="kayit" options={{ presentation: "modal" }} />
      </Stack>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: `mobile/app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { renk, fontAilesi } from "../../lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: renk.green600,
        tabBarInactiveTintColor: renk.faint,
        tabBarLabelStyle: { fontFamily: fontAilesi.govdeKalin, fontSize: 11 },
        tabBarStyle: { backgroundColor: renk.white, borderTopColor: renk.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Sohbet", tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="belgelerim" options={{ title: "Belgelerim", tabBarIcon: ({ color, size }) => <Feather name="file-text" size={size} color={color} /> }} />
      <Tabs.Screen name="hesap" options={{ title: "Hesap", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 3: Manuel doğrulama (Expo Go)** — `cd mobile && npx expo start`; Expo Go ile QR okut. Uygulama 3 sekmeyle açılmalı (ekranlar Task 9-12'de dolacak; şimdilik boş placeholder ekranlar tsc geçmesi için gerekebilir — Task 9-12 bunları oluşturur, bu yüzden bu adım Task 12 sonrası tam doğrulanır).

- [ ] **Step 4: Commit**

```bash
git add mobile/app/_layout.tsx "mobile/app/(tabs)/_layout.tsx"
git commit -m "feat(mobil): kök layout + font yükleme + alt sekme navigasyonu"
```

---

## Phase 4 — Ekranlar

### Task 9: Sohbet ekranı (`(tabs)/index.tsx`) + `RizaOnay` + `preview-cache`

**Files:**
- Create: `mobile/app/(tabs)/index.tsx`, `mobile/components/RizaOnay.tsx`, `mobile/lib/preview-cache.ts`

**Interfaces:**
- Consumes: `apiFetch`, `useAuth().token`, `ChatBubble`, `TypingDots`, `Banner`, `GreenHeader`, `Button`.
- Produces: `preview-cache`: `setOnizleme(id, metin)`, `getOnizleme(id)`. `RizaOnay`: `<RizaOnay onOnayla() busy />`.

- [ ] **Step 1: `mobile/lib/preview-cache.ts`**

```ts
// generate yanıtındaki maskeli önizlemeyi ekranlar arası taşımak için hafif in-memory cache.
const cache = new Map<string, string>();
export function setOnizleme(id: string, metin: string) { cache.set(id, metin); }
export function getOnizleme(id: string): string | undefined { return cache.get(id); }
```

- [ ] **Step 2: `mobile/components/RizaOnay.tsx`**

```tsx
import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius, fontAilesi } from "../lib/theme";
import { API_URL } from "../lib/config";
import Button from "./Button";

export default function RizaOnay({ onOnayla, busy }: { onOnayla: () => void; busy: boolean }) {
  const [kabul, setKabul] = useState(false);
  return (
    <View style={s.card}>
      <Pressable style={s.row} onPress={() => setKabul((k) => !k)}>
        <View style={[s.check, kabul && s.checkOn]}>{kabul && <Feather name="check" size={14} color={renk.white} />}</View>
        <Text style={s.text}>
          <Text style={s.link} onPress={() => Linking.openURL(`${API_URL}/kvkk`)}>KVKK aydınlatma metni</Text>
          {" "}ve sorumluluk reddini okudum, kabul ediyorum.
        </Text>
      </Pressable>
      <Button label={busy ? "Belgeniz hazırlanıyor..." : "Belgeyi Oluştur"} onPress={onOnayla} disabled={!kabul} busy={busy} style={{ marginTop: 16 }} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: radius.lg, padding: 18, marginTop: 18 },
  row: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: "#C3D3CA", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: renk.green600, borderColor: renk.green600 },
  text: { flex: 1, fontFamily: fontAilesi.govde, fontSize: 14.5, lineHeight: 21, color: "#3F524A" },
  link: { color: renk.green600, fontFamily: fontAilesi.govdeKalin },
});
```

- [ ] **Step 3: `mobile/app/(tabs)/index.tsx`**

```tsx
import { useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { renk, radius, fontAilesi } from "../../lib/theme";
import { apiFetch } from "../../lib/api";
import type { ChatYanit, GenerateYanit, Msg } from "../../lib/types";
import GreenHeader from "../../components/GreenHeader";
import ChatBubble from "../../components/ChatBubble";
import TypingDots from "../../components/TypingDots";
import Banner from "../../components/Banner";
import RizaOnay from "../../components/RizaOnay";
import { setOnizleme } from "../../lib/preview-cache";

export default function Sohbet() {
  const router = useRouter();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [tamam, setTamam] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [olusturuluyor, setOlusturuluyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function gonder() {
    const mesaj = input.trim();
    if (!mesaj || gonderiliyor) return;
    setHata(null);
    setMsgs((m) => [...m, { rol: "user", icerik: mesaj }]);
    setInput("");
    setGonderiliyor(true);
    try {
      const d = await apiFetch<ChatYanit>("/api/chat", { method: "POST", body: caseId ? { caseId, mesaj } : { mesaj } });
      setCaseId(d.caseId);
      setMsgs((m) => [...m, { rol: "assistant", icerik: d.cevap }]);
      setTamam(d.tamamlandi);
    } catch (e: any) {
      setHata(e?.message ?? "Bir hata oluştu.");
    } finally {
      setGonderiliyor(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  async function olustur() {
    if (!caseId || olusturuluyor) return;
    setHata(null);
    setOlusturuluyor(true);
    try {
      const d = await apiFetch<GenerateYanit>("/api/generate", { method: "POST", body: { caseId, rizaOnay: true } });
      setOnizleme(d.documentId, d.onizleme);
      router.push(`/onizleme/${d.documentId}`);
    } catch (e: any) {
      setHata(e?.message ?? "Belge oluşturulamadı.");
    } finally {
      setOlusturuluyor(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: renk.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <GreenHeader baslik="Derdinizi Anlatın" altMetin="Gerekli bilgileri size adım adım soralım." />
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {hata && <Banner tur="error" mesaj={hata} />}
        {msgs.length === 0 && (
          <ChatBubble rol="assistant" icerik="Merhaba! Ben hukuki belge asistanınızım. Yaşadığınız sorunu kısaca anlatır mısınız?" />
        )}
        {msgs.map((m, i) => <ChatBubble key={i} rol={m.rol} icerik={m.icerik} />)}
        {gonderiliyor && <TypingDots />}
        {tamam && !olusturuluyor && <RizaOnay onOnayla={olustur} busy={olusturuluyor} />}
        {olusturuluyor && <RizaOnay onOnayla={() => {}} busy={true} />}
      </ScrollView>
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Derdinizi anlatın..."
          placeholderTextColor={renk.faint}
          onSubmitEditing={gonder}
          returnKeyType="send"
        />
        <Pressable style={s.send} onPress={gonder} disabled={gonderiliyor}>
          <Feather name="send" size={18} color={renk.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  inputRow: { flexDirection: "row", gap: 8, padding: 12, alignItems: "center", backgroundColor: renk.bg, borderTopWidth: 1, borderTopColor: renk.borderSoft },
  input: { flex: 1, borderWidth: 1, borderColor: renk.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11, fontFamily: fontAilesi.govde, fontSize: 15, backgroundColor: renk.white, color: renk.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: renk.green600, alignItems: "center", justifyContent: "center" },
});
```

- [ ] **Step 4: Manuel doğrulama (Expo Go)** — Sohbet ekranında mesaj yaz → asistan cevabı gelir → bilgiler tamamlanınca "Belgeyi Oluştur" belirir → basınca önizleme ekranına yönlenir. (Canlı backend gerektirir; Task 13'te tam akış.)

- [ ] **Step 5: Commit**

```bash
git add "mobile/app/(tabs)/index.tsx" mobile/components/RizaOnay.tsx mobile/lib/preview-cache.ts
git commit -m "feat(mobil): Sohbet ekranı + KVKK onayı + önizleme cache"
```

---

### Task 10: Önizleme + `DocPreview` + `PaywallSheet` + ödeme/indirme

**Files:**
- Create: `mobile/app/onizleme/[documentId].tsx`, `mobile/components/DocPreview.tsx`, `mobile/components/PaywallSheet.tsx`, `mobile/lib/odeme.ts`

**Interfaces:**
- Consumes: `getOnizleme` (Task 9), `apiFetch`, `useAuth().token`, `expo-web-browser`, `expo-file-system`, `expo-sharing`.
- Produces: `odeme.ts`: `odemeBaslat(documentId, token): Promise<void>` (payment/init → WebBrowser), `belgeDurumu(documentId, token): Promise<"taslak"|"odendi">`, `belgeIndir(documentId, format, token): Promise<void>` (file-system + sharing).

- [ ] **Step 1: `mobile/lib/odeme.ts`**

```ts
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { apiFetch } from "./api";
import { API_URL } from "./config";
import type { PaymentInitYanit } from "./types";

// Sağlayıcı checkout'unu in-app tarayıcıda açar; kullanıcı ödeyip döner.
export async function odemeBaslat(documentId: string, token: string): Promise<void> {
  const d = await apiFetch<PaymentInitYanit>("/api/payment/init", {
    method: "POST", token, body: { documentId, saglayici: "iyzico" },
  });
  await WebBrowser.openBrowserAsync(d.paymentPageUrl);
}

export async function belgeDurumu(documentId: string, token: string): Promise<"taslak" | "odendi"> {
  try {
    await apiFetch(`/api/document/${documentId}`, { token });
    return "odendi"; // 200 → içerik döndü → ödenmiş
  } catch (e: any) {
    if (e?.status === 402) return "taslak"; // ödeme gerekli
    throw e;
  }
}

// Ödenmiş belgeyi Bearer ile indirip paylaş/aç.
export async function belgeIndir(documentId: string, format: "pdf" | "docx", token: string): Promise<void> {
  const hedef = `${FileSystem.cacheDirectory}belge-${documentId}.${format}`;
  const { uri, status } = await FileSystem.downloadAsync(
    `${API_URL}/api/document/${documentId}/download?format=${format}`,
    hedef,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (status !== 200) throw { status, message: "Belge indirilemedi." };
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
}
```

- [ ] **Step 2: `mobile/components/DocPreview.tsx`**

```tsx
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius, fontAilesi } from "../lib/theme";

export default function DocPreview({ onizleme }: { onizleme: string }) {
  return (
    <View>
      <View style={s.head}>
        <Text style={s.title}>Önizleme</Text>
        <View style={s.pill}><Feather name="lock" size={12} color={renk.draftInk} /><Text style={s.pillText}>Taslak — kilitli</Text></View>
      </View>
      <View style={s.card}>
        <Text style={s.body}>{onizleme}</Text>
        <View style={s.fade} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontFamily: fontAilesi.baslik, fontSize: 22, color: renk.ink },
  pill: { flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: renk.draftBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fontAilesi.govdeKalin, fontSize: 11, color: renk.draftInk },
  card: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: radius.lg, padding: 16, overflow: "hidden" },
  body: { fontFamily: fontAilesi.govde, fontSize: 13.5, lineHeight: 21, color: "#2A3A33" },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 80, backgroundColor: "transparent" },
});
```

- [ ] **Step 3: `mobile/components/PaywallSheet.tsx`** (Modal + Animated, ekstra native modül yok)

```tsx
import { useEffect, useRef } from "react";
import { Modal, View, Text, Pressable, Animated, StyleSheet, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius, fontAilesi } from "../lib/theme";
import Button from "./Button";

type Props = {
  gorunur: boolean;
  fiyat: number;
  busy: boolean;
  onOde: () => void;
  onKapat: () => void;
};

export default function PaywallSheet({ gorunur, fiyat, busy, onOde, onKapat }: Props) {
  const y = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  useEffect(() => {
    Animated.timing(y, { toValue: gorunur ? 0 : Dimensions.get("window").height, duration: 240, useNativeDriver: true }).start();
  }, [gorunur, y]);

  return (
    <Modal visible={gorunur} transparent animationType="fade" onRequestClose={onKapat}>
      <Pressable style={s.backdrop} onPress={onKapat} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: y }] }]}>
        <View style={s.grab} />
        <View style={s.badge}><Feather name="lock" size={20} color={renk.green800} /></View>
        <Text style={s.title}>Belgenin tamamı hazır</Text>
        <Text style={s.sub}>Ödemeyi tamamlayın, belgenizi PDF ve Word olarak indirin.</Text>
        <Button label={`Web'de öde ve indir — ${fiyat} TL`} onPress={onOde} busy={busy} />
        <Button label="Daha sonra" variant="ghost" onPress={onKapat} style={{ marginTop: 8 }} />
        <View style={s.guven}><Feather name="shield" size={13} color={renk.muted} /><Text style={s.guvenText}>Güvenli ödeme · iyzico / Stripe</Text></View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,20,15,0.4)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: renk.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 32 },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#D9E4DE", alignSelf: "center", marginBottom: 16 },
  badge: { width: 46, height: 46, borderRadius: 12, backgroundColor: renk.mint, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 },
  title: { fontFamily: fontAilesi.govdeKalin, fontSize: 16, color: renk.ink, textAlign: "center", marginBottom: 4 },
  sub: { fontFamily: fontAilesi.govde, fontSize: 13.5, color: renk.muted, textAlign: "center", lineHeight: 20, marginBottom: 18 },
  guven: { flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", marginTop: 12 },
  guvenText: { fontFamily: fontAilesi.govde, fontSize: 12.5, color: renk.muted },
});
```

- [ ] **Step 4: `mobile/app/onizleme/[documentId].tsx`**

```tsx
import { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { renk, fontAilesi } from "../../lib/theme";
import { getOnizleme } from "../../lib/preview-cache";
import { useAuth } from "../../lib/auth";
import { odemeBaslat, belgeDurumu, belgeIndir } from "../../lib/odeme";
import GreenHeader from "../../components/GreenHeader";
import DocPreview from "../../components/DocPreview";
import PaywallSheet from "../../components/PaywallSheet";
import Banner from "../../components/Banner";
import Button from "../../components/Button";

const FIYAT = 99;

export default function OnizlemeEkrani() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const onizleme = documentId ? getOnizleme(documentId) : undefined;

  const [sheetAcik, setSheetAcik] = useState(false);
  const [busy, setBusy] = useState(false);
  const [odendi, setOdendi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function odeVeIndir() {
    if (!documentId) return;
    if (!token) { router.push("/giris"); return; }
    setBusy(true); setHata(null);
    try {
      await odemeBaslat(documentId, token);
      // Tarayıcı kapandıktan sonra durumu yokla
      const durum = await belgeDurumu(documentId, token);
      if (durum === "odendi") { setOdendi(true); setSheetAcik(false); }
      else setHata("Ödeme tamamlanmadı görünüyor. Ödeme yaptıysanız birkaç saniye sonra tekrar deneyin.");
    } catch (e: any) {
      setHata(e?.message ?? "Ödeme başlatılamadı.");
    } finally { setBusy(false); }
  }

  async function indir(format: "pdf" | "docx") {
    if (!documentId || !token) return;
    setBusy(true); setHata(null);
    try { await belgeIndir(documentId, format, token); }
    catch (e: any) { setHata(e?.message ?? "Belge indirilemedi."); }
    finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader
        baslik="Önizleme"
        sol={<Pressable onPress={() => router.back()}><Feather name="arrow-left" size={22} color={renk.white} /></Pressable>}
      />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {hata && <Banner tur="error" mesaj={hata} />}
        {onizleme ? <DocPreview onizleme={onizleme} /> : <Banner tur="warn" mesaj="Önizleme bulunamadı. Lütfen sohbete dönüp belgeyi yeniden oluşturun." />}
        {odendi ? (
          <View style={s.odendiKart}>
            <Text style={s.odendiBaslik}>Ödeme alındı — belgeniz hazır</Text>
            <Button label="PDF indir" onPress={() => indir("pdf")} busy={busy} />
            <Button label="Word (DOCX) indir" variant="ghost" onPress={() => indir("docx")} busy={busy} style={{ marginTop: 8 }} />
          </View>
        ) : (
          onizleme && <Button label={`Web'de öde ve indir — ${FIYAT} TL`} onPress={() => setSheetAcik(true)} style={{ marginTop: 16 }} />
        )}
      </ScrollView>
      <PaywallSheet gorunur={sheetAcik} fiyat={FIYAT} busy={busy} onOde={odeVeIndir} onKapat={() => setSheetAcik(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  odendiKart: { backgroundColor: renk.successBg, borderRadius: 16, padding: 18, marginTop: 16 },
  odendiBaslik: { fontFamily: fontAilesi.govdeKalin, fontSize: 15, color: renk.success, marginBottom: 14, textAlign: "center" },
});
```

- [ ] **Step 5: Typecheck + Commit**

Run: `cd mobile && npx tsc --noEmit`
Expected: bu dosyalardan kaynaklı hata yok.

```bash
git add mobile/app/onizleme mobile/components/DocPreview.tsx mobile/components/PaywallSheet.tsx mobile/lib/odeme.ts
git commit -m "feat(mobil): önizleme + paywall sheet + ödeme/indirme akışı"
```

---

### Task 11: Giriş + Kayıt ekranları

**Files:**
- Create: `mobile/app/giris.tsx`, `mobile/app/kayit.tsx`

**Interfaces:**
- Consumes: `useAuth().girisYap/kayitOl`, `Field`, `Button`, `Banner`, `GreenHeader`.

- [ ] **Step 1: `mobile/app/giris.tsx`**

```tsx
import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { renk, fontAilesi } from "../lib/theme";
import { useAuth } from "../lib/auth";
import GreenHeader from "../components/GreenHeader";
import Field from "../components/Field";
import Button from "../components/Button";
import Banner from "../components/Banner";

export default function Giris() {
  const router = useRouter();
  const { girisYap } = useAuth();
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function gonder() {
    setBusy(true); setHata(null);
    try { await girisYap(email.trim(), parola); router.back(); }
    catch (e: any) { setHata(e?.message ?? "Giriş başarısız."); }
    finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader baslik="Giriş Yap" altMetin="Belgelerinize ulaşmak için giriş yapın." />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        {hata && <Banner tur="error" mesaj={hata} />}
        <View style={s.card}>
          <Field label="E-posta" value={email} onChangeText={setEmail} placeholder="ornek@eposta.com" keyboardType="email-address" />
          <Field label="Parola" value={parola} onChangeText={setParola} placeholder="••••••••" secureTextEntry />
          <Button label="Giriş Yap" onPress={gonder} busy={busy} disabled={!email || !parola} />
        </View>
        <Text style={s.alt}>
          Hesabınız yok mu? <Text style={s.link} onPress={() => router.replace("/kayit")}>Kayıt olun</Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: 18, padding: 18 },
  alt: { textAlign: "center", marginTop: 16, fontFamily: fontAilesi.govde, fontSize: 14, color: renk.muted },
  link: { color: renk.green600, fontFamily: fontAilesi.govdeKalin },
});
```

- [ ] **Step 2: `mobile/app/kayit.tsx`** — Giriş ile aynı yapı; `kayitOl` çağırır, alt bağlantı "Giriş yapın" → `router.replace("/giris")`, en az 6 karakter parola:

```tsx
import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { renk, fontAilesi } from "../lib/theme";
import { useAuth } from "../lib/auth";
import GreenHeader from "../components/GreenHeader";
import Field from "../components/Field";
import Button from "../components/Button";
import Banner from "../components/Banner";

export default function Kayit() {
  const router = useRouter();
  const { kayitOl } = useAuth();
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function gonder() {
    if (parola.length < 6) { setHata("Parola en az 6 karakter olmalı."); return; }
    setBusy(true); setHata(null);
    try { await kayitOl(email.trim(), parola, ad.trim() || undefined); router.back(); }
    catch (e: any) { setHata(e?.message ?? "Kayıt başarısız."); }
    finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader baslik="Kayıt Ol" altMetin="Birkaç saniyede hesap oluşturun." />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        {hata && <Banner tur="error" mesaj={hata} />}
        <View style={s.card}>
          <Field label="Ad (opsiyonel)" value={ad} onChangeText={setAd} placeholder="Adınız" autoCapitalize="sentences" />
          <Field label="E-posta" value={email} onChangeText={setEmail} placeholder="ornek@eposta.com" keyboardType="email-address" />
          <Field label="Parola" value={parola} onChangeText={setParola} placeholder="En az 6 karakter" secureTextEntry />
          <Button label="Kayıt Ol" onPress={gonder} busy={busy} disabled={!email || !parola} />
        </View>
        <Text style={s.alt}>
          Zaten hesabınız var mı? <Text style={s.link} onPress={() => router.replace("/giris")}>Giriş yapın</Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: 18, padding: 18 },
  alt: { textAlign: "center", marginTop: 16, fontFamily: fontAilesi.govde, fontSize: 14, color: renk.muted },
  link: { color: renk.green600, fontFamily: fontAilesi.govdeKalin },
});
```

- [ ] **Step 3: Typecheck + Commit**

Run: `cd mobile && npx tsc --noEmit`
```bash
git add mobile/app/giris.tsx mobile/app/kayit.tsx
git commit -m "feat(mobil): giriş ve kayıt ekranları (token tabanlı)"
```

---

### Task 12: Hesap + Belgelerim ekranları

**Files:**
- Create: `mobile/app/(tabs)/hesap.tsx`, `mobile/app/(tabs)/belgelerim.tsx`

**Interfaces:**
- Consumes: `useAuth`, `apiFetch`, `CasesYanit`.

- [ ] **Step 1: `mobile/app/(tabs)/hesap.tsx`**

```tsx
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { renk, fontAilesi } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import GreenHeader from "../../components/GreenHeader";
import Button from "../../components/Button";

export default function Hesap() {
  const router = useRouter();
  const { girisYapildi, cikisYap } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader baslik="Hesabım" />
      <View style={{ padding: 18 }}>
        {girisYapildi ? (
          <View style={s.card}>
            <Text style={s.durum}>Giriş yapıldı.</Text>
            <Button label="Çıkış Yap" variant="ghost" onPress={cikisYap} />
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.durum}>Belgelerinizi kaydetmek ve ödemek için giriş yapın.</Text>
            <Button label="Giriş Yap" onPress={() => router.push("/giris")} />
            <Button label="Kayıt Ol" variant="ghost" onPress={() => router.push("/kayit")} style={{ marginTop: 8 }} />
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: 18, padding: 20 },
  durum: { fontFamily: fontAilesi.govde, fontSize: 15, color: renk.muted, marginBottom: 16, lineHeight: 22 },
});
```

- [ ] **Step 2: `mobile/app/(tabs)/belgelerim.tsx`**

```tsx
import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { renk, fontAilesi } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import type { Case, CasesYanit } from "../../lib/types";
import GreenHeader from "../../components/GreenHeader";
import Button from "../../components/Button";
import Banner from "../../components/Banner";

export default function Belgelerim() {
  const router = useRouter();
  const { girisYapildi, token } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!token) return;
    setYukleniyor(true); setHata(null);
    try { const d = await apiFetch<CasesYanit>("/api/cases", { token }); setCases(d.cases); }
    catch (e: any) { setHata(e?.message ?? "Belgeler yüklenemedi."); }
    finally { setYukleniyor(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { if (girisYapildi) yukle(); }, [girisYapildi, yukle]));

  if (!girisYapildi) {
    return (
      <View style={{ flex: 1, backgroundColor: renk.bg }}>
        <GreenHeader baslik="Belgelerim" />
        <View style={{ padding: 18 }}>
          <Text style={s.bos}>Belgelerinizi görmek için giriş yapın.</Text>
          <Button label="Giriş Yap" onPress={() => router.push("/giris")} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader baslik="Belgelerim" />
      {hata && <View style={{ padding: 16 }}><Banner tur="error" mesaj={hata} /></View>}
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={cases}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
        ListEmptyComponent={!yukleniyor ? <Text style={s.bos}>Henüz belgeniz yok. Sohbet sekmesinden başlayın.</Text> : null}
        renderItem={({ item }) => {
          const belge = item.documents[0];
          return (
            <View style={s.kart}>
              <Text style={s.baslik} numberOfLines={1}>{item.baslik}</Text>
              <Text style={s.kategori}>{item.kategori}</Text>
              {belge && (
                <View style={[s.rozet, belge.durum === "odendi" ? s.rozetOdendi : s.rozetTaslak]}>
                  <Text style={[s.rozetText, { color: belge.durum === "odendi" ? renk.success : renk.draftInk }]}>
                    {belge.durum === "odendi" ? "Ödendi" : "Taslak"}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  bos: { fontFamily: fontAilesi.govde, fontSize: 15, color: renk.muted, marginBottom: 16, lineHeight: 22 },
  kart: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: 14, padding: 16, marginBottom: 12 },
  baslik: { fontFamily: fontAilesi.govdeKalin, fontSize: 15, color: renk.ink },
  kategori: { fontFamily: fontAilesi.govde, fontSize: 13, color: renk.muted, marginTop: 3 },
  rozet: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 10 },
  rozetOdendi: { backgroundColor: renk.successBg },
  rozetTaslak: { backgroundColor: renk.draftBg },
  rozetText: { fontFamily: fontAilesi.govdeKalin, fontSize: 11 },
});
```

- [ ] **Step 3: Typecheck + Commit**

Run: `cd mobile && npx tsc --noEmit`
Expected: tüm mobil kaynak tip hatasız.

```bash
git add "mobile/app/(tabs)/hesap.tsx" "mobile/app/(tabs)/belgelerim.tsx"
git commit -m "feat(mobil): Hesap ve Belgelerim ekranları"
```

---

## Phase 5 — Doğrulama & Devir

### Task 13: Tam doğrulama + manuel Expo Go dumanlanma + devir notları

**Files:**
- Create: `mobile/README.md`
- Modify: `docs/superpowers/plans/2026-07-09-mobil-uygulama-serbest-mod.md` (bu plan — bitti işaretleme)

- [ ] **Step 1: Otomatik doğrulama — backend**

Run:
```bash
docker compose -f docker-compose.dev.yml up -d db
docker compose -f docker-compose.dev.yml run --rm app npm test
docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit
```
Expected: tüm testler yeşil (169 + yeni auth testleri), tsc temiz.

- [ ] **Step 2: Otomatik doğrulama — mobil**

Run:
```bash
cd mobile && npm test && npx tsc --noEmit
```
Expected: `api.test.ts` + `token.test.ts` yeşil; tsc temiz.

- [ ] **Step 3: `mobile/README.md`** — çalıştırma/deploy talimatı:

```markdown
# Hukuki Asistan — Mobil (Expo)

## Çalıştırma
    cd mobile
    npm install
    npx expo start            # QR'ı Expo Go ile okut

Varsayılan backend: `https://ai-hukuki-asistan.fly.dev`.
Farklı backend: `EXPO_PUBLIC_API_URL=https://... npx expo start`.

## Test
    npm test                  # lib birim testleri (api, token)
    npx tsc --noEmit          # tip kontrolü

## Ön koşul
Backend'e token-auth değişikliği (Bearer + login/register token) DEPLOY edilmiş olmalı;
aksi halde giriş ve ödeme adımı 401 verir.
```

- [ ] **Step 4: Manuel Expo Go dumanlanma listesi** (kullanıcı, fiziksel telefonda):
  1. `npx expo start` → Expo Go ile QR okut → uygulama 3 sekmeyle açılır.
  2. Sohbet: derdini yaz → asistan soru sorar → bilgi tamamlanınca "Belgeyi Oluştur" belirir.
  3. Oluştur → Önizleme ekranı, maskeli metin + "Web'de öde ve indir".
  4. Öde → giriş yoksa Giriş modalı → giriş/kayıt → geri dönüş.
  5. Ödeme sheet → sağlayıcı checkout (in-app tarayıcı) → sandbox kartla öde.
  6. Dönüşte "Ödeme alındı" → PDF/Word indir → paylaşım sayfası açılır.
  7. Belgelerim: vaka listelenir, durum rozeti doğru.
  8. Hesap: çıkış → tekrar giriş gerektiren ekranlar kilitlenir.

- [ ] **Step 5: Final commit**

```bash
git add mobile/README.md docs/superpowers/plans/2026-07-09-mobil-uygulama-serbest-mod.md
git commit -m "docs(mobil): README + doğrulama; MVP tamamlandı"
```

---

## Devir Notları (agent → kullanıcı)

Otonom olarak yapılamayanlar (kullanıcı adımı):
1. **Backend deploy:** token-auth değişikliğini Fly.io'ya deploy et (`fly deploy`) — mobil canlıya bağlanır.
2. **Fly.io URL teyidi:** gerçek URL `ai-hukuki-asistan.fly.dev` değilse `EXPO_PUBLIC_API_URL` ile geç.
3. **Expo Go cihaz testi:** QR okutma + sandbox ödeme fiziksel telefon gerektirir (Step 4 listesi).
4. **iyzico sandbox kartı:** ödeme akışını sandbox test kartıyla doğrula.
