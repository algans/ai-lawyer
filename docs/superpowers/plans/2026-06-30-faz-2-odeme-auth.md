# Faz 2: Auth + Ödeme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Bu plan görev seviyesinde; uygulamaya başlamadan önce her görev bite-sized adımlara (TDD: failing test → impl → pass → commit) genişletilecektir.

**Goal:** Para kazanabilir ürün — kayıt/giriş, iyzico ödeme, ödeme sonrası tam belge + PDF/Word indirme.

**Architecture:** Faz 1 motoru üstüne auth ve ödeme katmanı. iyzico bir `PaymentProvider` arayüzü ardına soyutlanır (PayTR'ye geçişi kolaylaştırmak için). Tam belge metni sadece `Document.durum === "odendi"` ise sunulur.

**Tech Stack:** Faz 1 + `iyzipay` (Node SDK), `bcryptjs` (parola hash), `jose` (JWT/cookie), `@react-pdf/renderer` veya `docx` (belge çıktısı).

## Global Constraints

- iyzico anahtarları sadece `.env`: `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` (sandbox: `https://sandbox-api.iyzipay.com`).
- Tam belge metni hiçbir koşulda ödeme doğrulanmadan API'den dönmez (sunucu-taraflı kontrol).
- Oturum: `httpOnly`, `Secure`, `SameSite=Lax` cookie. Parola asla düz metin saklanmaz (bcrypt).
- Ödeme callback'i imza/`paymentId` ile doğrulanır; sahte callback belge kilidini açamaz.

---

### Task 1: Auth — kayıt/giriş + oturum

**Files:**
- Modify: `prisma/schema.prisma` (User'a `parolaHash String?` ekle), migration
- Create: `src/lib/auth.ts` (hashParola, dogrulaParola, oturumOlustur(userId), oturumOku(req))
- Create: `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`
- Create: `src/app/(auth)/giris/page.tsx`, `src/app/(auth)/kayit/page.tsx`
- Test: `src/lib/auth.test.ts`, auth route testleri

**Interfaces:**
- Consumes: `prisma`
- Produces:
  - `hashParola(p: string): Promise<string>`, `dogrulaParola(p, hash): Promise<boolean>`
  - `oturumOlustur(userId: string): Promise<string>` (imzalı JWT), `oturumOku(req): Promise<{ userId: string } | null>`
  - `POST /api/auth/register` `{ email, parola, ad? }` → cookie set + `{ userId }`
  - `POST /api/auth/login` `{ email, parola }` → cookie set + `{ userId }`

**Anahtar kod (auth.ts özü):**
```typescript
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);
export const hashParola = (p: string) => bcrypt.hash(p, 10);
export const dogrulaParola = (p: string, h: string) => bcrypt.compare(p, h);
export async function oturumOlustur(userId: string) {
  return new SignJWT({ userId }).setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d").sign(secret);
}
export async function oturumOku(token?: string) {
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret); return { userId: payload.userId as string }; }
  catch { return null; }
}
```

**Test odakları:** parola hash round-trip; geçersiz JWT → null; kayıt aynı email → 409; login yanlış parola → 401.

---

### Task 2: Payment tablosu + iyzico provider soyutlaması

**Files:**
- Modify: `prisma/schema.prisma` (Faz 0 spec'teki `Payment` modeli), migration
- Create: `src/lib/payment/provider.ts` (arayüz), `src/lib/payment/iyzico.ts` (uygulama)
- Test: `src/lib/payment/iyzico.test.ts` (SDK mock'lu)

**Interfaces:**
- Produces:
  - `interface PaymentProvider { checkoutBaslat(input): Promise<{ token: string; odemeUrl: string; iyzicoRef: string }>; callbackDogrula(body): Promise<{ basarili: boolean; iyzicoRef: string }> }`
  - `iyzicoProvider: PaymentProvider`

**Anahtar kod (provider.ts):**
```typescript
export interface CheckoutInput {
  documentId: string; tutar: number; userEmail: string; callbackUrl: string;
}
export interface PaymentProvider {
  checkoutBaslat(i: CheckoutInput): Promise<{ token: string; odemeUrl: string; iyzicoRef: string }>;
  callbackDogrula(body: unknown): Promise<{ basarili: boolean; iyzicoRef: string }>;
}
```

**Not:** iyzico Checkout Form (CheckoutFormInitialize) kullanılır — kart verisi iyzico tarafında. Fiyat tek noktadan: `src/lib/pricing.ts` → `BELGE_FIYATI = 99` (TL).

**Test odakları:** `checkoutBaslat` SDK'yi doğru parametrelerle çağırır; `callbackDogrula` başarılı/başarısız durumu doğru çevirir.

---

### Task 3: Ödeme başlatma rotası — `/api/payment/init`

**Files:**
- Create: `src/app/api/payment/init/route.ts`
- Create: `src/lib/pricing.ts`
- Test: route testi

**Interfaces:**
- Consumes: `oturumOku`, `iyzicoProvider`, `prisma`, `BELGE_FIYATI`
- Produces: `POST /api/payment/init` `{ documentId }` → `{ odemeUrl }`. Giriş zorunlu (oturum yoksa 401). `Payment` kaydı `durum="bekliyor"` oluşturur.

**Akış:** oturum doğrula → document'in case'i kullanıcıya ait mi kontrol et → provider.checkoutBaslat → Payment kaydet → odemeUrl dön.

---

### Task 4: Ödeme callback — `/api/payment/callback`

**Files:**
- Create: `src/app/api/payment/callback/route.ts`
- Test: route testi (sahte callback reddi dahil)

**Interfaces:**
- Consumes: `iyzicoProvider.callbackDogrula`, `prisma`
- Produces: `POST /api/payment/callback` → iyzico doğrulaması başarılıysa ilgili `Payment.durum="basarili"` ve `Document.durum="odendi"`, kullanıcıyı başarı sayfasına yönlendirir.

**Kritik test:** Geçersiz/sahte callback → `Document.durum` `taslak` kalır (kilit açılmaz).

---

### Task 5: Tam belge erişimi — `/api/document/[id]`

**Files:**
- Create: `src/app/api/document/[id]/route.ts`
- Test: route testi (ödenmemiş → 402/403)

**Interfaces:**
- Consumes: `oturumOku`, `prisma`
- Produces: `GET /api/document/:id` → oturum sahibi + `durum==="odendi"` ise tam `icerik`; aksi halde `{ error }` 402. **Tam metnin tek meşru çıkış noktası burası.**

**Kritik test:** `durum==="taslak"` → tam metin DÖNMEZ; başka kullanıcının belgesi → 403.

---

### Task 6: PDF/Word üretimi + indirme

**Files:**
- Create: `src/lib/export/pdf.ts`, `src/lib/export/docx.ts`
- Create: `src/app/api/document/[id]/download/route.ts`
- Test: export birim testleri

**Interfaces:**
- Consumes: Task 5 erişim kontrolü, belge `icerik`
- Produces:
  - `belgeyiPdf(icerik: string): Promise<Buffer>`, `belgeyiDocx(icerik: string): Promise<Buffer>`
  - `GET /api/document/:id/download?format=pdf|docx` → ödeme doğrulanmışsa dosya stream; değilse 402.

**Test odakları:** üretilen buffer boş değil + doğru MIME; ödenmemiş belgede indirme reddi.

---

### Task 7: Belge geçmişi sayfası

**Files:**
- Create: `src/app/hesap/page.tsx`, `src/app/api/cases/route.ts`
- Test: cases route testi

**Interfaces:**
- Consumes: `oturumOku`, `prisma`
- Produces: `GET /api/cases` → kullanıcının vakaları + belgeleri (durum ile). `/hesap` sayfası listeler, ödenmiş belgeler için tekrar indirme linki.

---

### Task 8: Paywall'ı frontend'e bağla + "nereye nasıl göndereceğin" rehberi

**Files:**
- Modify: `src/components/ChatBox.tsx`, `src/components/SmartForm.tsx` (devre dışı butonu gerçek ödeme akışına bağla)
- Create: `src/lib/ai/prompts/rehber.ts`, `src/app/api/rehber/route.ts`
- Test: rehber route testi

**Interfaces:**
- Produces:
  - Önizlemedeki "Tam Belgeyi İndir — 99 TL" → giriş kontrolü → `/api/payment/init` → iyzico → callback → indirme açılır.
  - `POST /api/rehber` `{ documentId }` → ödeme sonrası "Bu belgeyi hangi mercie, nasıl (e-Devlet/elden/posta), hangi sürede göndermelisiniz" kısa rehberi (Haiku ile, belge tipi + merciden üretilir).

---

## Self-Review Notları

- **Spec kapsamı:** Auth (Task 1) ✓, Payment modeli (Task 2) ✓, iyzico soyutlama (Task 2) ✓, init/callback (Task 3-4) ✓, sunucu-taraflı tam-metin kilidi (Task 5) ✓, PDF/Word (Task 6) ✓, belge geçmişi (Task 7) ✓, "nereye nasıl" rehberi (Task 8) ✓, freemium paywall önizleme sonrası (Task 8) ✓.
- **Güvenlik:** kart verisi iyzico tarafında; callback doğrulama; sahte callback testi; sahiplik kontrolü.
- **Faz 3'e bırakılan:** KVKK rıza akışı, rate limit, eval, kapsamlı E2E.
