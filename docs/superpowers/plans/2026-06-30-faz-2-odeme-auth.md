# Faz 2: Auth + Ödeme — Implementation Plan (bite-sized)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Faz 1 çekirdeğini para kazanabilir ürüne çevir: e-posta+parola auth, iyzico ödeme, ödeme sonrası tam belge + PDF/Word indirme, belge geçmişi.

**Architecture:** Faz 1 monoliti üstüne auth + ödeme katmanı. iyzico bir `PaymentProvider` arayüzü ardına soyutlanır. Tam belge metni yalnızca (sahip + `Document.durum==="odendi"`) ise sunulur. Ayrıca Faz 1 review'ından iki teknik borç kapatılır: sınıflandırma artık Case'e bir kez yazılır (her istekte `classify()` çağrılmaz), ve belge üretimi sunucu-tarafında "bilgi tamam" kapısına bağlanır.

**Tech Stack:** Faz 1 (Next.js 15, TS, Prisma/Postgres, Vitest, Zod, Docker) + `bcryptjs` (parola hash), `jose` (JWT cookie), `iyzipay` (ödeme SDK), `@react-pdf/renderer` (PDF), `docx` (Word).

## Global Constraints

- Tüm dev/test Docker'da: `docker compose -f docker-compose.dev.yml run --rm app <cmd>`.
- Tam belge metni (`Document.icerik`) hiçbir koşulda ödeme doğrulanmadan API'den dönmez (sunucu-taraflı kontrol). Faz 1'de `/api/generate` yalnızca `maskPreview` döndürür — bu korunur.
- Belge başı fiyat tek sabit: `BELGE_FIYATI = 99` (TL), `src/lib/pricing.ts`.
- Oturum: `httpOnly`, `sameSite:"lax"`, prod'da `secure` cookie adı `oturum`. Parola asla düz metin — `bcryptjs` (maliyet 10).
- iyzico anahtarları yalnızca `.env`: `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` (sandbox: `https://sandbox-api.iyzipay.com`). `SESSION_SECRET` (JWT imza) da `.env`.
- iyzico ödeme yöntemi: **Checkout Form** (kart verisi iyzico tarafında). Akış: `checkoutFormInitialize` → `paymentPageUrl`; kullanıcı öder → iyzico `callbackUrl`'e `token` POST'lar → sunucu `checkoutForm.retrieve({token})` → `paymentStatus==="SUCCESS"` doğrular.
- AI JSON her zaman Zod ile doğrulanır. Promptlar `src/lib/ai/prompts/` altında. Model split: üretim=Opus (`MODELS.quality`), sınıflandırma/toplama/öz-kontrol=Haiku (`MODELS.fast`).
- Tüm kullanıcıya görünen metinler Türkçe.
- Test mock deseni (proje konvansiyonu): `vi.fn()` `vi.mock(...)` factory'si İÇİNDE + `vi.mocked()` erişimci; `beforeEach`'te `vi.clearAllMocks()`. Üst-seviye `const x = vi.fn()` hoisting hatası verir.
- `.env.example` her yeni değişkenle güncellenir.

---

### Task 1: Sınıflandırmayı Case'de kalıcılaştır + üretim "bilgi tamam" kapısı

Faz 1 review borcu: `/api/chat` takip dalı ve `/api/generate` her istekte `classify()` çağırıyordu (ekstra LLM maliyeti + drift). Bu task sınıflandırmayı Case'e bir kez yazar; sonraki istekler okur. Ayrıca `/api/generate`'i sunucu-tarafında `bilgiTamam` kapısına bağlar.

**Files:**
- Modify: `prisma/schema.prisma` (Case'e alanlar) + yeni migration
- Create: `src/lib/case.ts` (Case'ten Classification okuma yardımcısı)
- Modify: `src/app/api/chat/route.ts`, `src/app/api/generate/route.ts`, `src/app/api/form-fields/route.ts`
- Test: `src/lib/case.test.ts`; mevcut `chat/route.test.ts`, `generate/route.test.ts`, `form-fields/route.test.ts` güncellenir

**Interfaces:**
- Consumes: `classify`, `Classification`, `ClassificationSchema` (Faz 1), `nextQuestion`, `prisma`.
- Produces:
  - Case yeni alanları: `belgeTipi String?`, `merci String?`, `eksikBilgiler String[] @default([])`, `bilgiTamam Boolean @default(false)`. (`kategori` zaten var.)
  - `caseClassification(c: { kategori: string|null; belgeTipi: string|null; merci: string|null; eksikBilgiler: string[] }): Classification | null` — Case satırından `Classification` kurar; alanlar eksik/geçersizse `null` (Zod ile doğrular). `src/lib/case.ts`.
  - Davranış: `/api/chat` ilk mesaj + `/api/form-fields` Case'i sınıflandırma alanlarıyla yazar. `/api/chat` takip dalı ve `/api/generate` artık `classify()` ÇAĞIRMAZ; Case'ten okur. `/api/chat` `nextQuestion` `tamamlandi:true` dönünce (veya ilk mesajda `eksikBilgiler` boşsa) `Case.bilgiTamam=true` set eder. `/api/generate` `bilgiTamam` değilse `409 { error: "Bilgiler henüz tamamlanmadı." }` döner.

- [ ] **Step 1: Şema alanlarını ekle + migration**

`prisma/schema.prisma` içinde `model Case` alanlarına ekle (mevcut alanları koru):
```prisma
  belgeTipi     String?
  merci         String?
  eksikBilgiler String[]  @default([])
  bilgiTamam    Boolean   @default(false)
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npx prisma migrate dev --name case_classification`
Expected: yeni migration oluşur ve uygulanır.

- [ ] **Step 2: `caseClassification` için failing test yaz**

`src/lib/case.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { caseClassification } from "./case";

describe("caseClassification", () => {
  it("builds a Classification from a fully populated case row", () => {
    const c = caseClassification({ kategori: "tuketici", belgeTipi: "THH başvurusu", merci: "İlçe THH", eksikBilgiler: ["tarih"] });
    expect(c).toEqual({ kategori: "tuketici", belgeTipi: "THH başvurusu", merci: "İlçe THH", eksikBilgiler: ["tarih"] });
  });
  it("returns null when kategori is missing", () => {
    expect(caseClassification({ kategori: null, belgeTipi: "x", merci: "y", eksikBilgiler: [] })).toBeNull();
  });
  it("returns null when belgeTipi/merci missing", () => {
    expect(caseClassification({ kategori: "tuketici", belgeTipi: null, merci: "y", eksikBilgiler: [] })).toBeNull();
  });
});
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- case`
Expected: FAIL (module yok).

- [ ] **Step 3: `src/lib/case.ts` yaz**

```typescript
import { ClassificationSchema, type Classification } from "@/lib/ai/classifier";

export function caseClassification(c: {
  kategori: string | null;
  belgeTipi: string | null;
  merci: string | null;
  eksikBilgiler: string[];
}): Classification | null {
  const parsed = ClassificationSchema.safeParse({
    kategori: c.kategori,
    belgeTipi: c.belgeTipi,
    merci: c.merci,
    eksikBilgiler: c.eksikBilgiler,
  });
  return parsed.success ? parsed.data : null;
}
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- case`
Expected: PASS.

- [ ] **Step 4: `/api/chat` — ilk mesajda sınıflandırmayı Case'e yaz, takip dalında oku**

`src/app/api/chat/route.ts`'i güncelle. İlk mesaj dalında `case.create` `data`'sına sınıflandırmayı ekle ve `bilgiTamam`'ı hesapla:
```typescript
  if (!caseId) {
    const classification = await classify(mesaj);
    const bilgiTamam = classification.eksikBilgiler.length === 0;
    const c = await prisma.case.create({
      data: {
        baslik: mesaj.slice(0, 60),
        kategori: classification.kategori,
        belgeTipi: classification.belgeTipi,
        merci: classification.merci,
        eksikBilgiler: classification.eksikBilgiler,
        bilgiTamam,
      },
    });
    await prisma.message.create({ data: { caseId: c.id, rol: "user", icerik: mesaj } });
    const q = bilgiTamam
      ? { soru: null, tamamlandi: true }
      : await nextQuestion([{ rol: "user", icerik: mesaj }], classification.eksikBilgiler);
    const cevap = q.soru ?? "Bilgiler tamam, belgenizi oluşturabilirim.";
    await prisma.message.create({ data: { caseId: c.id, rol: "assistant", icerik: cevap } });
    return NextResponse.json({ caseId: c.id, cevap, tamamlandi: q.tamamlandi });
  }
```
Takip dalını, `classify` yerine Case'ten okuyacak ve `tamamlandi` olunca `bilgiTamam` yazacak şekilde değiştir:
```typescript
  await prisma.message.create({ data: { caseId, rol: "user", icerik: mesaj } });
  const kayit = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kayit) return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
  const history = await prisma.message.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  const q = await nextQuestion(
    history.map((m) => ({ rol: m.rol, icerik: m.icerik })),
    kayit.eksikBilgiler
  );
  if (q.tamamlandi && !kayit.bilgiTamam) {
    await prisma.case.update({ where: { id: caseId }, data: { bilgiTamam: true } });
  }
  const cevap = q.soru ?? "Bilgiler tamam, belgenizi oluşturabilirim.";
  await prisma.message.create({ data: { caseId, rol: "assistant", icerik: cevap } });
  return NextResponse.json({ caseId, cevap, tamamlandi: q.tamamlandi });
```
`classify` importu takip dalında artık kullanılmıyor ama ilk dalda kullanılıyor — import kalır.

- [ ] **Step 5: `/api/form-fields` — sınıflandırmayı Case'e yaz**

`src/app/api/form-fields/route.ts` içinde `case.create` `data`'sını genişlet:
```typescript
  const created = await prisma.case.create({
    data: {
      baslik: aciklama.slice(0, 60),
      kategori: c.kategori,
      belgeTipi: c.belgeTipi,
      merci: c.merci,
      eksikBilgiler: c.eksikBilgiler,
    },
  });
```
(Form modunda `bilgiTamam`, kullanıcı alanları doldurup `/api/chat`'e özet mesaj gönderince takip dalında set edilir.)

- [ ] **Step 6: `/api/generate` — Case'ten oku, `bilgiTamam` kapısı, artık `classify` çağırma**

`src/app/api/generate/route.ts`'i güncelle:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { generateDocument } from "@/lib/ai/generator";
import { maskPreview } from "@/lib/preview";
import { caseClassification } from "@/lib/case";

const Body = z.object({ caseId: z.string().min(1), ton: z.enum(["resmi", "sert", "uzlasmaci"]).optional() });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek: caseId gerekli." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek: caseId gerekli." }, { status: 400 });
  const { caseId, ton } = parsed.data;

  const kayit = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kayit) return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
  if (!kayit.bilgiTamam) return NextResponse.json({ error: "Bilgiler henüz tamamlanmadı." }, { status: 409 });

  const classification = caseClassification(kayit);
  if (!classification) return NextResponse.json({ error: "Vaka sınıflandırması eksik." }, { status: 409 });

  const history = await prisma.message.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  const toplananBilgi = history.map((m) => `${m.rol}: ${m.icerik}`).join("\n");

  const icerik = await generateDocument({ classification, toplananBilgi, ton });
  const doc = await prisma.document.create({
    data: { caseId, tip: classification.belgeTipi, merci: classification.merci, icerik, durum: "taslak" },
  });
  return NextResponse.json({ documentId: doc.id, onizleme: maskPreview(icerik) });
}
```

- [ ] **Step 7: Etkilenen route testlerini güncelle/güçlendir**

`generate/route.test.ts`: artık `classify` mock'u YOK; `case.findUnique` mock'u `{ kategori:"tuketici", belgeTipi:"THH", merci:"İlçe THH", eksikBilgiler:[], bilgiTamam:true }` döndürür. Ekle: `bilgiTamam:false` iken 409 ve `generateDocument`/`document.create` çağrılmaz. Faz 1'in güvenlik/persistans/404 testlerini koru (gerçek `maskPreview`, mock'lu db/generator).
`chat/route.test.ts`: ilk mesaj dalı `case.create`'i sınıflandırma alanlarıyla çağırır; takip dalı `case.findUnique` mock'u kullanır (classify çağrılmaz), `tamamlandi:true` iken `case.update({data:{bilgiTamam:true}})` çağrılır.
`form-fields/route.test.ts`: `case.create` `belgeTipi/merci/eksikBilgiler` ile çağrılır.
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test`
Expected: tüm suite yeşil.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(faz2): sınıflandırmayı Case'de sakla + üretim bilgiTamam kapısı"
```

---

### Task 2: Auth — e-posta + parola, oturum

**Files:**
- Modify: `prisma/schema.prisma` (User'a `parolaHash String?`) + migration
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`
- Create: `src/app/kayit/page.tsx`, `src/app/giris/page.tsx`, `src/components/AuthForm.tsx`
- Modify: `package.json` (`bcryptjs`, `jose`, `@types/bcryptjs`), `.env.example` (`SESSION_SECRET`)
- Test: `src/lib/auth.test.ts`, `src/app/api/auth/register/route.test.ts`, `src/app/api/auth/login/route.test.ts`

**Interfaces:**
- Consumes: `prisma`.
- Produces:
  - `hashParola(p: string): Promise<string>`, `dogrulaParola(p: string, hash: string): Promise<boolean>`
  - `oturumTokeni(userId: string): Promise<string>` (imzalı JWT, 7g), `oturumDogrula(token?: string): Promise<{ userId: string } | null>`
  - `oturumCurrentUser(req: NextRequest): Promise<{ userId: string } | null>` — `oturum` cookie'sini okuyup doğrular.
  - `COOKIE_ADI = "oturum"`.
  - `POST /api/auth/register` `{ email, parola, ad? }` → 201 `{ userId }` + `oturum` cookie; email varsa 409.
  - `POST /api/auth/login` `{ email, parola }` → 200 `{ userId }` + cookie; hatalı → 401.
  - `POST /api/auth/logout` → cookie temizler, 200.

- [ ] **Step 1: Bağımlılıklar + şema + env**

`package.json` dependencies: `"bcryptjs": "^2.4.3"`, `"jose": "^5.9.6"`; devDependencies: `"@types/bcryptjs": "^2.4.6"`.
`prisma/schema.prisma` `model User`'a ekle: `parolaHash String?`
`.env.example`'a ekle: `SESSION_SECRET="en-az-32-karakter-rastgele-deger"`
Run: `docker compose -f docker-compose.dev.yml run --rm app npm install`
Run: `docker compose -f docker-compose.dev.yml run --rm app npx prisma migrate dev --name user_parola`
Expected: kurulum + migration başarılı.

- [ ] **Step 2: `auth.ts` için failing test yaz**

`src/lib/auth.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { hashParola, dogrulaParola, oturumTokeni, oturumDogrula } from "./auth";

describe("auth", () => {
  it("hashes and verifies a password round-trip", async () => {
    const h = await hashParola("gizli123");
    expect(h).not.toBe("gizli123");
    expect(await dogrulaParola("gizli123", h)).toBe(true);
    expect(await dogrulaParola("yanlis", h)).toBe(false);
  });
  it("signs a session token and verifies it", async () => {
    const t = await oturumTokeni("user-1");
    expect(await oturumDogrula(t)).toEqual({ userId: "user-1" });
  });
  it("returns null for a bad/absent token", async () => {
    expect(await oturumDogrula(undefined)).toBeNull();
    expect(await oturumDogrula("bozuk.token.xyz")).toBeNull();
  });
});
```
Not: test için `SESSION_SECRET` gerekir — `vitest.config.ts`'e `test.env: { SESSION_SECRET: "test-secret-32-chars-min-aaaaaaaa" }` ekle (bu adımın parçası).
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- auth`
Expected: FAIL (module yok).

- [ ] **Step 3: `src/lib/auth.ts` yaz**

```typescript
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export const COOKIE_ADI = "oturum";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export const hashParola = (p: string) => bcrypt.hash(p, 10);
export const dogrulaParola = (p: string, hash: string) => bcrypt.compare(p, hash);

export async function oturumTokeni(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function oturumDogrula(token?: string): Promise<{ userId: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}

export async function oturumCurrentUser(req: NextRequest): Promise<{ userId: string } | null> {
  return oturumDogrula(req.cookies.get(COOKIE_ADI)?.value);
}
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- auth`
Expected: PASS.

- [ ] **Step 4: register route + testi yaz**

`src/app/api/auth/register/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { hashParola, oturumTokeni, COOKIE_ADI } from "@/lib/auth";

const Body = z.object({ email: z.string().email(), parola: z.string().min(6), ad: z.string().optional() });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Geçerli e-posta ve en az 6 karakter parola gerekli." }, { status: 400 });
  const { email, parola, ad } = parsed.data;

  const mevcut = await prisma.user.findUnique({ where: { email } });
  if (mevcut) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });

  const user = await prisma.user.create({ data: { email, ad, parolaHash: await hashParola(parola) } });
  const res = NextResponse.json({ userId: user.id }, { status: 201 });
  res.cookies.set(COOKIE_ADI, await oturumTokeni(user.id), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
```
`src/app/api/auth/register/route.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
const findUnique = vi.fn();
const create = vi.fn();
vi.mock("@/lib/db", () => ({ default: { user: { findUnique, create } } }));
import { POST } from "./route";

describe("POST /api/auth/register", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("creates a user and sets session cookie", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ email: "a@b.com", parola: "gizli123" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect((await res.json()).userId).toBe("u1");
    expect(res.headers.get("set-cookie")).toContain("oturum=");
  });
  it("rejects duplicate email with 409", async () => {
    findUnique.mockResolvedValue({ id: "existing" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ email: "a@b.com", parola: "gizli123" }) });
    expect((await POST(req as any)).status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects invalid body with 400", async () => {
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ email: "x", parola: "123" }) });
    expect((await POST(req as any)).status).toBe(400);
  });
});
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- register`
Expected: PASS.

- [ ] **Step 5: login + logout route + login testi yaz**

`src/app/api/auth/login/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { dogrulaParola, oturumTokeni, COOKIE_ADI } from "@/lib/auth";

const Body = z.object({ email: z.string().email(), parola: z.string().min(1) });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "E-posta ve parola gerekli." }, { status: 400 });
  const { email, parola } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.parolaHash || !(await dogrulaParola(parola, user.parolaHash))) {
    return NextResponse.json({ error: "E-posta veya parola hatalı." }, { status: 401 });
  }
  const res = NextResponse.json({ userId: user.id });
  res.cookies.set(COOKIE_ADI, await oturumTokeni(user.id), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
```
`src/app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { COOKIE_ADI } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ADI, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```
`src/app/api/auth/login/route.test.ts`: başarılı giriş (cookie set), yanlış parola → 401 (`create` yok), geçersiz body → 400. (register testinin desenini izle; `user.findUnique` mock'la, `parolaHash` gerçek bir hash olsun ki `dogrulaParola` gerçek çalışsın — `bcrypt.hashSync("dogru", 10)` ile üret.)
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- login`
Expected: PASS.

- [ ] **Step 6: AuthForm bileşeni + kayit/giris sayfaları**

`src/components/AuthForm.tsx` (client): `mod: "kayit" | "giris"` prop'u alır; email+parola (+kayıtta ad) input'ları `value` bağlı (controlled); submit `POST /api/auth/{register|login}` (header `{ "Content-Type": "application/json" }`), başarıda `window.location.href = "/hesap"`, hata mesajını gösterir.
`src/app/kayit/page.tsx` → `<AuthForm mod="kayit" />`, `src/app/giris/page.tsx` → `<AuthForm mod="giris" />`. Tüm metinler Türkçe.
Verify: `docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit` temiz + tüm suite yeşil.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(faz2): e-posta+parola auth (kayıt/giriş/çıkış + oturum cookie)"
```

---

### Task 3: Payment modeli + fiyat + iyzico provider soyutlaması

**Files:**
- Modify: `prisma/schema.prisma` (`Payment` modeli + enum) + migration
- Create: `src/lib/pricing.ts`
- Create: `src/lib/payment/provider.ts` (arayüz + tipler)
- Create: `src/lib/payment/iyzico.ts` (uygulama)
- Modify: `package.json` (`iyzipay`), `.env.example` (iyzico anahtarları)
- Test: `src/lib/payment/iyzico.test.ts`

**Interfaces:**
- Produces:
  - `BELGE_FIYATI = 99` (number, TL), `PARA_BIRIMI = "TRY"` — `src/lib/pricing.ts`.
  - `Payment` modeli: `id, userId, documentId, tutar Int, durum PaymentDurum, iyzicoRef String?, createdAt`. Enum `PaymentDurum { bekliyor basarili basarisiz }`.
  - `interface CheckoutInput { documentId: string; tutar: number; conversationId: string; callbackUrl: string; buyerEmail: string; buyerId: string }`
  - `interface PaymentProvider { checkoutBaslat(i: CheckoutInput): Promise<{ paymentPageUrl: string; token: string }>; callbackDogrula(token: string): Promise<{ basarili: boolean; iyzicoRef: string }> }`
  - `iyzicoProvider: PaymentProvider` — `src/lib/payment/iyzico.ts`.

- [ ] **Step 1: Bağımlılık + şema + env**

`package.json` dependencies: `"iyzipay": "^2.0.61"`.
`prisma/schema.prisma`:
```prisma
enum PaymentDurum { bekliyor basarili basarisiz }

model Payment {
  id         String       @id @default(cuid())
  userId     String
  documentId String
  tutar      Int
  durum      PaymentDurum @default(bekliyor)
  iyzicoRef  String?
  createdAt  DateTime     @default(now())
}
```
`.env.example`'a ekle:
```
IYZICO_API_KEY="sandbox-..."
IYZICO_SECRET_KEY="sandbox-..."
IYZICO_BASE_URL="https://sandbox-api.iyzipay.com"
APP_URL="http://localhost:3000"
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm install`
Run: `docker compose -f docker-compose.dev.yml run --rm app npx prisma migrate dev --name payment`
Expected: başarılı.

- [ ] **Step 2: pricing.ts + provider.ts (arayüz) yaz**

`src/lib/pricing.ts`:
```typescript
export const BELGE_FIYATI = 99;
export const PARA_BIRIMI = "TRY";
```
`src/lib/payment/provider.ts`:
```typescript
export interface CheckoutInput {
  documentId: string;
  tutar: number;
  conversationId: string;
  callbackUrl: string;
  buyerEmail: string;
  buyerId: string;
}
export interface PaymentProvider {
  checkoutBaslat(i: CheckoutInput): Promise<{ paymentPageUrl: string; token: string }>;
  callbackDogrula(token: string): Promise<{ basarili: boolean; iyzicoRef: string }>;
}
```

- [ ] **Step 3: iyzico.ts için failing test yaz (SDK mock'lu)**

`src/lib/payment/iyzico.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const checkoutFormInitialize = { create: vi.fn() };
const checkoutForm = { retrieve: vi.fn() };
vi.mock("iyzipay", () => ({
  default: class {
    static LOCALE = { TR: "tr" };
    static CURRENCY = { TRY: "TRY" };
    static PAYMENT_GROUP = { PRODUCT: "PRODUCT" };
    static BASKET_ITEM_TYPE = { VIRTUAL: "VIRTUAL" };
    checkoutFormInitialize = checkoutFormInitialize;
    checkoutForm = checkoutForm;
  },
}));
import { iyzicoProvider } from "./iyzico";

describe("iyzicoProvider", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("checkoutBaslat resolves paymentPageUrl + token on success", async () => {
    checkoutFormInitialize.create.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "success", token: "tok1", paymentPageUrl: "https://iyz/pay/tok1" }));
    const r = await iyzicoProvider.checkoutBaslat({
      documentId: "d1", tutar: 99, conversationId: "c1",
      callbackUrl: "http://t/cb", buyerEmail: "a@b.com", buyerId: "u1",
    });
    expect(r).toEqual({ paymentPageUrl: "https://iyz/pay/tok1", token: "tok1" });
  });
  it("checkoutBaslat rejects when iyzico returns failure status", async () => {
    checkoutFormInitialize.create.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "failure", errorMessage: "hata" }));
    await expect(iyzicoProvider.checkoutBaslat({
      documentId: "d1", tutar: 99, conversationId: "c1",
      callbackUrl: "http://t/cb", buyerEmail: "a@b.com", buyerId: "u1",
    })).rejects.toThrow();
  });
  it("callbackDogrula returns basarili=true when paymentStatus SUCCESS", async () => {
    checkoutForm.retrieve.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "success", paymentStatus: "SUCCESS", paymentId: "pay1" }));
    expect(await iyzicoProvider.callbackDogrula("tok1")).toEqual({ basarili: true, iyzicoRef: "pay1" });
  });
  it("callbackDogrula returns basarili=false when not SUCCESS", async () => {
    checkoutForm.retrieve.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "success", paymentStatus: "FAILURE", paymentId: "pay1" }));
    expect((await iyzicoProvider.callbackDogrula("tok1")).basarili).toBe(false);
  });
});
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- iyzico`
Expected: FAIL (module yok).

- [ ] **Step 4: `src/lib/payment/iyzico.ts` yaz**

```typescript
import Iyzipay from "iyzipay";
import type { CheckoutInput, PaymentProvider } from "./provider";

const client = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  uri: process.env.IYZICO_BASE_URL!,
});

function initialize(req: object): Promise<any> {
  return new Promise((resolve, reject) => {
    (client as any).checkoutFormInitialize.create(req, (err: unknown, result: any) => {
      if (err) return reject(err);
      if (result?.status !== "success") return reject(new Error(result?.errorMessage ?? "iyzico başlatma hatası"));
      resolve(result);
    });
  });
}
function retrieve(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    (client as any).checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token }, (err: unknown, result: any) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export const iyzicoProvider: PaymentProvider = {
  async checkoutBaslat(i: CheckoutInput) {
    const result = await initialize({
      locale: Iyzipay.LOCALE.TR,
      conversationId: i.conversationId,
      price: i.tutar.toString(),
      paidPrice: i.tutar.toString(),
      currency: Iyzipay.CURRENCY.TRY,
      basketId: i.documentId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: i.callbackUrl,
      buyer: {
        id: i.buyerId, name: "Musteri", surname: "Kullanici", email: i.buyerEmail,
        identityNumber: "11111111111", registrationAddress: "Turkiye", city: "Istanbul", country: "Turkey",
        ip: "85.34.78.112",
      },
      basketItems: [{
        id: i.documentId, name: "Hukuki belge", category1: "Hizmet",
        itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL, price: i.tutar.toString(),
      }],
    });
    return { paymentPageUrl: result.paymentPageUrl, token: result.token };
  },
  async callbackDogrula(token: string) {
    const result = await retrieve(token);
    return { basarili: result?.paymentStatus === "SUCCESS", iyzicoRef: result?.paymentId ?? "" };
  },
};
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- iyzico`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(faz2): payment modeli + fiyat + iyzico provider soyutlaması"
```

---

### Task 4: `/api/payment/init` — ödeme başlat

**Files:**
- Create: `src/app/api/payment/init/route.ts`
- Test: `src/app/api/payment/init/route.test.ts`

**Interfaces:**
- Consumes: `oturumCurrentUser` (Task 2), `iyzicoProvider` (Task 3), `BELGE_FIYATI`, `prisma`.
- Produces: `POST /api/payment/init` `{ documentId }` → `{ paymentPageUrl }`. Oturum yoksa 401. Belge yoksa/başkasına aitse 404. `Payment` (`durum:"bekliyor"`, `tutar:BELGE_FIYATI`, `iyzicoRef:token`) oluşturur. Callback URL: `${APP_URL}/api/payment/callback`.

- [ ] **Step 1: Failing test yaz**

`src/app/api/payment/init/route.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
const findUnique = vi.fn();
const paymentCreate = vi.fn();
vi.mock("@/lib/db", () => ({ default: { document: { findUnique }, payment: { create: paymentCreate } } }));
const oturumCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ oturumCurrentUser }));
const checkoutBaslat = vi.fn();
vi.mock("@/lib/payment/iyzico", () => ({ iyzicoProvider: { checkoutBaslat } }));
import { POST } from "./route";

describe("POST /api/payment/init", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.APP_URL = "http://t"; });
  it("401 when not logged in", async () => {
    oturumCurrentUser.mockResolvedValue(null);
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    expect((await POST(req as any)).status).toBe(401);
  });
  it("404 when document not owned by user", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", case: { userId: "baskasi" } });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    expect((await POST(req as any)).status).toBe(404);
    expect(checkoutBaslat).not.toHaveBeenCalled();
  });
  it("starts checkout and returns paymentPageUrl", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", case: { userId: "u1" } });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok1" });
    paymentCreate.mockResolvedValue({ id: "p1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    const res = await POST(req as any);
    expect((await res.json()).paymentPageUrl).toBe("https://iyz/pay");
    expect(paymentCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ durum: "bekliyor", tutar: 99, iyzicoRef: "tok1" }) }));
  });
});
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- payment/init`
Expected: FAIL.

- [ ] **Step 2: route yaz**

`src/app/api/payment/init/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";
import { iyzicoProvider } from "@/lib/payment/iyzico";
import { BELGE_FIYATI } from "@/lib/pricing";

const Body = z.object({ documentId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "documentId gerekli." }, { status: 400 });

  const doc = await prisma.document.findUnique({ where: { id: parsed.data.documentId }, include: { case: true } });
  if (!doc || doc.case.userId !== oturum.userId) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: oturum.userId } });
  const { paymentPageUrl, token } = await iyzicoProvider.checkoutBaslat({
    documentId: doc.id,
    tutar: BELGE_FIYATI,
    conversationId: doc.id,
    callbackUrl: `${process.env.APP_URL}/api/payment/callback`,
    buyerEmail: user?.email ?? "musteri@example.com",
    buyerId: oturum.userId,
  });
  await prisma.payment.create({
    data: { userId: oturum.userId, documentId: doc.id, tutar: BELGE_FIYATI, durum: "bekliyor", iyzicoRef: token },
  });
  return NextResponse.json({ paymentPageUrl });
}
```
Not: bu route'un çalışması için `Document.case` ilişkisinin `userId` taşıması gerekir. Case ödeme öncesi bir kullanıcıya bağlanmalı — bkz. Task 8 (belge üretimi öncesi/paywall'da giriş) ve Task 4 Step 3.

- [ ] **Step 3: Case'i kullanıcıya bağlama notu**

Faz 1'de Case `userId` olmadan oluşuyor (giriş zorunlu değil). Ödeme için Case bir kullanıcıya ait olmalı. `/api/payment/init` içinde, `doc.case.userId` null ise ve kullanıcı giriş yapmışsa Case'i o kullanıcıya bağla (sahiplenme): route'ta `findUnique`'ten sonra ekle:
```typescript
  if (!doc) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  if (doc.case.userId && doc.case.userId !== oturum.userId) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  if (!doc.case.userId) await prisma.case.update({ where: { id: doc.caseId }, data: { userId: oturum.userId } });
```
(Yukarıdaki Step 2 kodundaki sahiplik kontrolünü bununla değiştir; testte `case.userId: null` senaryosu ekle: bağlanır ve ödeme başlar.)
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- payment/init`
Expected: PASS (testleri bu davranışa göre güncelle).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(faz2): /api/payment/init (iyzico checkout başlat + case sahiplenme)"
```

---

### Task 5: `/api/payment/callback` — ödeme doğrula, belgeyi aç

**Files:**
- Create: `src/app/api/payment/callback/route.ts`
- Test: `src/app/api/payment/callback/route.test.ts`

**Interfaces:**
- Consumes: `iyzicoProvider.callbackDogrula`, `prisma`, `APP_URL`.
- Produces: `POST /api/payment/callback` — iyzico form-encoded `token` gönderir. `callbackDogrula(token)` başarılıysa: ilgili `Payment` (`iyzicoRef===token`) `durum:"basarili"` + `iyzicoRef:paymentId` güncellenir ve `Document.durum:"odendi"` yapılır; kullanıcı `${APP_URL}/hesap?odeme=basarili`'ya 303 redirect. Başarısızsa `Document` `taslak` kalır, `?odeme=basarisiz`'a redirect. **Sahte/başarısız callback belge kilidini açamaz.**

- [ ] **Step 1: Failing test yaz**

`src/app/api/payment/callback/route.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
const paymentFindFirst = vi.fn();
const paymentUpdate = vi.fn();
const documentUpdate = vi.fn();
vi.mock("@/lib/db", () => ({ default: {
  payment: { findFirst: paymentFindFirst, update: paymentUpdate },
  document: { update: documentUpdate },
} }));
const callbackDogrula = vi.fn();
vi.mock("@/lib/payment/iyzico", () => ({ iyzicoProvider: { callbackDogrula } }));
import { POST } from "./route";

function formReq(token: string) {
  return new Request("http://t/api/payment/callback", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }).toString(),
  });
}

describe("POST /api/payment/callback", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.APP_URL = "http://t"; });
  it("marks document odendi and redirects on success", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1" });
    const res = await POST(formReq("tok1") as any);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("odeme=basarili");
    expect(documentUpdate).toHaveBeenCalledWith({ where: { id: "d1" }, data: { durum: "odendi" } });
    expect(paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ durum: "basarili" }) }));
  });
  it("does NOT unlock document on failed verification", async () => {
    callbackDogrula.mockResolvedValue({ basarili: false, iyzicoRef: "" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1" });
    const res = await POST(formReq("tok1") as any);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
  });
});
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- payment/callback`
Expected: FAIL.

- [ ] **Step 2: route yaz**

`src/app/api/payment/callback/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { iyzicoProvider } from "@/lib/payment/iyzico";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const base = process.env.APP_URL ?? "";
  if (!token) return NextResponse.redirect(`${base}/hesap?odeme=basarisiz`, 303);

  const { basarili, iyzicoRef } = await iyzicoProvider.callbackDogrula(token);
  const payment = await prisma.payment.findFirst({ where: { iyzicoRef: token } });
  if (!payment) return NextResponse.redirect(`${base}/hesap?odeme=basarisiz`, 303);

  if (basarili) {
    await prisma.payment.update({ where: { id: payment.id }, data: { durum: "basarili", iyzicoRef } });
    await prisma.document.update({ where: { id: payment.documentId }, data: { durum: "odendi" } });
    return NextResponse.redirect(`${base}/hesap?odeme=basarili`, 303);
  }
  await prisma.payment.update({ where: { id: payment.id }, data: { durum: "basarisiz" } });
  return NextResponse.redirect(`${base}/hesap?odeme=basarisiz`, 303);
}
```
Not: `Payment.iyzicoRef` başlangıçta token'ı tutar (init'te), başarıda `paymentId` ile güncellenir — `findFirst({where:{iyzicoRef:token}})` init sonrası çalışır.
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- payment/callback`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(faz2): /api/payment/callback (doğrula + belge kilidini aç)"
```

---

### Task 6: `/api/document/[id]` — tam metin erişimi (sunucu kilidi)

**Files:**
- Create: `src/app/api/document/[id]/route.ts`
- Test: `src/app/api/document/[id]/route.test.ts`

**Interfaces:**
- Consumes: `oturumCurrentUser`, `prisma`.
- Produces: `GET /api/document/:id` → oturum sahibi + `Document.durum==="odendi"` ise `{ icerik, tip, merci }` (TAM metin). Oturum yok → 401; başkasının belgesi → 404; `durum==="taslak"` → 402 `{ error: "Belge için ödeme gerekli." }`. **Tam metnin tek meşru çıkışı burası.**

- [ ] **Step 1: Failing test yaz** — dört durum: 401 (oturum yok), 404 (sahip değil), 402 (ödenmemiş → `icerik` DÖNMEZ), 200 (ödenmiş → tam `icerik` döner). `document.findUnique` `{ id, icerik:"GİZLİ TAM METİN", durum, case:{userId} }` mock'lanır. Kritik assert: 402 yanıt gövdesi `"GİZLİ TAM METİN"` İÇERMEZ.
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- document`
Expected: FAIL.

- [ ] **Step 2: route yaz**

`src/app/api/document/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id }, include: { case: true } });
  if (!doc || doc.case.userId !== oturum.userId) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  if (doc.durum !== "odendi") return NextResponse.json({ error: "Belge için ödeme gerekli." }, { status: 402 });
  return NextResponse.json({ icerik: doc.icerik, tip: doc.tip, merci: doc.merci });
}
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- document`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(faz2): /api/document/[id] tam metin erişimi (ödeme kilidi)"
```

---

### Task 7: PDF/Word üretimi + indirme rotası

**Files:**
- Modify: `package.json` (`@react-pdf/renderer`, `docx`)
- Create: `src/lib/export/pdf.ts`, `src/lib/export/docx.ts`
- Create: `src/app/api/document/[id]/download/route.ts`
- Test: `src/lib/export/pdf.test.ts`, `src/lib/export/docx.test.ts`

**Interfaces:**
- Consumes: `oturumCurrentUser`, `prisma`.
- Produces:
  - `belgeyiPdf(icerik: string): Promise<Buffer>`, `belgeyiDocx(icerik: string): Promise<Buffer>` — boş olmayan buffer.
  - `GET /api/document/:id/download?format=pdf|docx` → sahip + `odendi` ise dosya (doğru `Content-Type` + `Content-Disposition: attachment`); değilse 402/404/401.

- [ ] **Step 1: Bağımlılık kur**

`package.json` dependencies: `"@react-pdf/renderer": "^4.1.6"`, `"docx": "^9.0.3"`.
Run: `docker compose -f docker-compose.dev.yml run --rm app npm install`

- [ ] **Step 2: docx üretici + testi yaz**

`src/lib/export/docx.ts`:
```typescript
import { Document, Packer, Paragraph } from "docx";

export async function belgeyiDocx(icerik: string): Promise<Buffer> {
  const paras = icerik.split("\n").map((satir) => new Paragraph(satir));
  const doc = new Document({ sections: [{ children: paras }] });
  return Packer.toBuffer(doc);
}
```
`src/lib/export/docx.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { belgeyiDocx } from "./docx";
describe("belgeyiDocx", () => {
  it("produces a non-empty docx buffer", async () => {
    const buf = await belgeyiDocx("Başlık\n\nİçerik satırı.");
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK"); // zip/docx magic
  });
});
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- docx`
Expected: PASS.

- [ ] **Step 3: pdf üretici + testi yaz**

`src/lib/export/pdf.ts` (react-pdf, JSX'siz `createElement` ile — bu dosya `.ts` kalır):
```typescript
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";

export async function belgeyiPdf(icerik: string): Promise<Buffer> {
  const satirlar = icerik.split("\n").map((s, i) =>
    createElement(Text, { key: i, style: { marginBottom: 4 } }, s || " "));
  const doc = createElement(
    Document, null,
    createElement(Page, { size: "A4", style: { padding: 40, fontSize: 11 } },
      createElement(View, null, ...satirlar))
  );
  return renderToBuffer(doc as any);
}
```
`src/lib/export/pdf.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { belgeyiPdf } from "./pdf";
describe("belgeyiPdf", () => {
  it("produces a non-empty pdf buffer", async () => {
    const buf = await belgeyiPdf("Başlık\n\nİçerik satırı.");
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- pdf`
Expected: PASS. (react-pdf düğüm ortamında `renderToBuffer` destekler.)

- [ ] **Step 4: download route yaz + testi**

`src/app/api/document/[id]/download/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";
import { belgeyiPdf } from "@/lib/export/pdf";
import { belgeyiDocx } from "@/lib/export/docx";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") === "docx" ? "docx" : "pdf";
  const doc = await prisma.document.findUnique({ where: { id }, include: { case: true } });
  if (!doc || doc.case.userId !== oturum.userId) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  if (doc.durum !== "odendi") return NextResponse.json({ error: "Belge için ödeme gerekli." }, { status: 402 });

  const [buf, mime, ext] = format === "docx"
    ? [await belgeyiDocx(doc.icerik), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"]
    : [await belgeyiPdf(doc.icerik), "application/pdf", "pdf"];
  return new NextResponse(buf as any, {
    headers: { "Content-Type": mime as string, "Content-Disposition": `attachment; filename="belge-${id}.${ext}"` },
  });
}
```
Test `download/route.test.ts`: ödenmemiş → 402 (üretici çağrılmaz — `belgeyiPdf`/`belgeyiDocx` mock'la ve `not.toHaveBeenCalled`); ödenmiş+pdf → 200 + `Content-Type: application/pdf`; ödenmiş+docx → doğru mime; sahip değil → 404.
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- download`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(faz2): PDF/Word üretimi + indirme rotası (ödeme kilitli)"
```

---

### Task 8: Belge geçmişi + `/api/cases`

**Files:**
- Create: `src/app/api/cases/route.ts`
- Create: `src/app/hesap/page.tsx`
- Test: `src/app/api/cases/route.test.ts`

**Interfaces:**
- Consumes: `oturumCurrentUser`, `prisma`.
- Produces: `GET /api/cases` → oturum yoksa 401; varsa kullanıcının Case'leri + her birinin Document'ları (`id, tip, durum, createdAt` — `icerik` HARİÇ). `/hesap` sayfası: giriş yoksa `/giris`'e yönlendirir; vakaları listeler, `durum:"odendi"` belgeler için PDF/Word indirme linkleri (`/api/document/:id/download?format=...`), `taslak` belgeler için "Öde ve indir" butonu (Task 9 akışını tetikler). URL'de `?odeme=basarili|basarisiz` varsa Türkçe bilgi mesajı gösterir.

- [ ] **Step 1: `/api/cases` failing test yaz** — 401 (oturum yok); 200'de yanıt `icerik` alanı İÇERMEZ (sadece meta). `case.findMany` mock'u documents ile döner.
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- cases`
Expected: FAIL.

- [ ] **Step 2: `/api/cases` route yaz**

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  const cases = await prisma.case.findMany({
    where: { userId: oturum.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, baslik: true, kategori: true, createdAt: true,
      documents: { select: { id: true, tip: true, durum: true, createdAt: true } },
    },
  });
  return NextResponse.json({ cases });
}
```
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- cases`
Expected: PASS.

- [ ] **Step 3: `/hesap` sayfası (client)** — `GET /api/cases` fetch eder, listeler; `odendi` belgede iki indirme linki, `taslak` belgede "Öde ve İndir (99 TL)" butonu (`onClick` → `POST /api/payment/init {documentId}` → dönen `paymentPageUrl`'e `window.location.href`). `?odeme` query mesajı. 401 dönerse `/giris`'e yönlendir. Türkçe.
Verify: `docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit` temiz + tüm suite yeşil.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(faz2): belge geçmişi + /api/cases"
```

---

### Task 9: Paywall'ı frontend'e bağla + "nereye nasıl gönderirim" rehberi + Faz 1 UI borçları

**Files:**
- Modify: `src/components/ChatBox.tsx`, `src/components/SmartForm.tsx`
- Create: `src/lib/ai/prompts/rehber.ts`, `src/app/api/rehber/route.ts`
- Modify: `src/app/layout.tsx` (giriş/hesap linkleri — basit üst menü)
- Test: `src/app/api/rehber/route.test.ts`

**Interfaces:**
- Consumes: `oturumCurrentUser`, `prisma`, `callClaude`, `MODELS`.
- Produces:
  - Önizlemedeki devre dışı "İndir" butonu artık aktif: giriş kontrolü (yoksa `/giris`'e) → `POST /api/payment/init {documentId}` → `paymentPageUrl`'e yönlendir. `ChatBox`/`SmartForm` `documentId`'yi `/api/generate` yanıtından saklar.
  - Faz 1 UI borçları kapatılır: (a) tüm `fetch` çağrılarına `headers: { "Content-Type": "application/json" }`; (b) `SmartForm` alan input'ları controlled (`value={degerler[a] ?? ""}`).
  - `POST /api/rehber` `{ documentId }` → sahip + `odendi` ise, belge tipi + merciden Haiku ile üretilmiş kısa "hangi mercie, nasıl (e-Devlet/elden/posta), hangi sürede göndermelisiniz" rehberi `{ rehber }`; değilse 402/404/401.

- [ ] **Step 1: rehber prompt + route + failing test**

`src/lib/ai/prompts/rehber.ts`:
```typescript
export const REHBER_SYSTEM = `Sen bir Türk hukuk süreç asistanısın. Kullanıcının hazırladığı belgeyi hangi mercie, nasıl (e-Devlet, elden, posta/iadeli taahhütlü) ve varsa hangi süre içinde göndermesi gerektiğini KISA ve maddeler halinde, sade Türkçe anlat. Emin olmadığın kesin süre/mevzuat maddesi verme; genel yönlendir.`;
export function rehberUser(belgeTipi: string, merci: string): string {
  return `Belge tipi: ${belgeTipi}\nGönderilecek merci: ${merci}`;
}
```
`src/app/api/rehber/route.ts`: Body `{ documentId }`; oturum + sahiplik + `odendi` kontrolü (aksi halde 401/404/402); sonra `callClaude({ model: MODELS.fast, system: REHBER_SYSTEM, user: rehberUser(doc.tip, doc.merci ?? "") })` → `{ rehber }`.
Test `rehber/route.test.ts`: 402 ödenmemişte (callClaude çağrılmaz), 200 ödenmişte `{rehber}` döner (callClaude mock'lu). 
Run: `docker compose -f docker-compose.dev.yml run --rm app npm test -- rehber`
Expected: PASS.

- [ ] **Step 2: ChatBox + SmartForm paywall + borç kapatma**

`ChatBox.tsx`: `generate()` yanıtından `documentId` sakla (`setDocumentId`). Önizleme bölümündeki devre dışı butonu değiştir:
```tsx
<button onClick={async () => {
  const r = await fetch("/api/payment/init", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId }),
  });
  if (r.status === 401) { window.location.href = "/giris"; return; }
  const d = await r.json();
  if (d.paymentPageUrl) window.location.href = d.paymentPageUrl;
}}>Tam Belgeyi İndir — 99 TL</button>
```
`ChatBox.tsx` + `SmartForm.tsx` içindeki TÜM `fetch(..., { method: "POST", body: ... })` çağrılarına `headers: { "Content-Type": "application/json" }` ekle. `SmartForm.tsx` alan input'unu controlled yap: `<input value={degerler[a] ?? ""} onChange=...>`. SmartForm önizlemesine de aynı paywall butonunu ekle (documentId sakla).
Verify: `docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit` temiz + tüm suite yeşil.

- [ ] **Step 3: Üst menü (layout)** — `src/app/layout.tsx` `body` içine basit bir üst bar: "AI Hukuki Asistan" (→ `/`), "Giriş" (→ `/giris`), "Hesabım" (→ `/hesap`) linkleri. Türkçe.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(faz2): paywall akışı + gönderim rehberi + UI borçlarının kapatılması"
```

---

## Self-Review Notları

- **Spec kapsamı (Faz 2):** Auth (Task 2) ✓, Payment modeli (Task 3) ✓, iyzico soyutlama (Task 3) ✓, init/callback (Task 4-5) ✓, sunucu-taraflı tam-metin kilidi (Task 6) ✓, PDF/Word (Task 7) ✓, belge geçmişi (Task 8) ✓, "nereye nasıl" rehberi (Task 9) ✓, freemium paywall önizleme sonrası (Task 9) ✓.
- **Faz 1 taşıma borçları:** classification'ı Case'de saklama (Task 1) ✓, üretim server-side kapısı (Task 1) ✓, Content-Type header'ları (Task 9) ✓, SmartForm controlled input (Task 9) ✓.
- **Güvenlik:** kart verisi iyzico tarafında; callback `retrieve` ile doğrulanır (sahte callback belge açmaz — Task 5 testi); tam metin tek çıkış `/api/document/[id]` + download, ikisi de sahiplik+`odendi` kilitli.
- **Tip tutarlılığı:** `oturumCurrentUser` (Task 2) tüm korumalı rotalarda; `PaymentProvider`/`iyzicoProvider` (Task 3) init+callback'te; `BELGE_FIYATI` (Task 3) init'te; `caseClassification` (Task 1) generate'te.
- **Faz 3'e bırakılan (bilinçli):** KVKK açık rıza akışı, rate limiting, prompt injection, AI eval, kapsamlı E2E, `maskPreview` tek-paragraf sertleştirmesi, compose healthcheck.
