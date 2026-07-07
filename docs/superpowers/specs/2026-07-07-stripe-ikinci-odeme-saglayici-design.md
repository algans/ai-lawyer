# Stripe'ı ikinci ödeme sağlayıcısı olarak ekleme — Tasarım

**Tarih:** 2026-07-07
**Durum:** Onaylandı, implementasyona hazır
**Kapsam:** iyzico'yu bozmadan, Stripe'ı (test modu) kullanıcı seçimli ikinci ödeme seçeneği olarak eklemek.

## Amaç

Mevcut iyzico entegrasyonu tamamen korunarak, kullanıcıya ödeme ekranında ikinci bir seçenek sunmak: **"Kart ile öde (Stripe)"**. Doğrulama Stripe webhook'u ile yapılır. İlk aşamada yalnızca **test modunda** (`sk_test_...`, test kartları) denenecek.

### Kararlar (netleşmiş)

1. **Doğrulama = webhook.** Kullanıcı tarayıcıyı kapatsa bile, para alındıysa belge açılır.
2. **Coexist.** iyzico'nun kod yolu davranış olarak değişmez.
3. **Kullanıcı UI'dan seçer.** `saglayici` parametresi `init` isteğine eklenir; parametre yoksa default `iyzico` (geriye dönük uyum).
4. **Ayrı kopya.** Paywall doğrulama mantığı webhook rotasına bağımsız yazılır; iyzico callback'i hiç düzenlenmez. Ortak `tamamla.ts` **yok**.
5. **Rename yok.** `Payment.iyzicoRef` kolonu korunur (yeniden adlandırmak iyzico kodunu değiştirmek olurdu). Stripe de session id'sini bu kolonda tutar. Sadece ayırt edici `saglayici` kolonu eklenir. Bu bilinçli bir minimal-churn kararıdır; ileride ayrı bir temizlik PR'ında rename düşünülebilir.

## En kritik invariant (korunmalı)

**Paywall:** Bir belge yalnızca ödeme **sunucu tarafında doğrulanmış** VE **tutar + para birimi beklenenle eşleştiğinde** `odendi` yapılır. Stripe webhook rotası bu kontrolü kendi içinde (iyzico callback'inden bağımsız bir kopya olarak) uygular. Tutar/para birimi eşleşmezse belge açılmaz.

## Mimari

Ödeme zaten `PaymentProvider` arayüzünün ardında soyut. Ekleyeceğimiz tek yapı taşı, `saglayici` anahtarını doğru implementasyona eşleyen küçük bir **registry**.

```
src/lib/payment/
  provider.ts      (mevcut — arayüz DEĞİŞMEZ; registry için dar bir tip eklenebilir)
  iyzico.ts        (mevcut — DOKUNULMAZ)
  stripe.ts        (YENİ — checkoutBaslat + webhookDogrula, lazy client)
  index.ts         (YENİ — getSaglayici("iyzico"|"stripe"))

src/app/api/payment/
  init/route.ts    (DEĞİŞİR — additive: saglayici param, registry ile yönlendirme)
  callback/route.ts(mevcut — iyzico, DOKUNULMAZ)
  webhook/route.ts (YENİ — Stripe imza doğrulama + paywall kopyası)
```

### Neden `PaymentProvider` arayüzü değişmiyor

iyzico `callbackDogrula(token)` (retrieve modeli), Stripe ise webhook modeli kullanır — doğrulama giriş noktaları farklı. Arayüze `callbackDogrula`'yı zorunlu tutmaya devam edersek Stripe onu uyduramaz; arayüzü daraltırsak iyzico.ts'in tip anotasyonu bozulur (excess-property). İkisinden de kaçınmak için:

- Registry yalnızca `checkoutBaslat`'a ihtiyaç duyar → `Pick<PaymentProvider, "checkoutBaslat">` dar tipiyle çalışır. Hem iyzico hem Stripe bunu karşılar.
- Stripe'ın webhook doğrulaması (`webhookDogrula`) paylaşılan arayüzün parçası **değildir**; yalnızca webhook rotası çağırır.

Sonuç: `provider.ts`'e olsa olsa additive bir tip eklenir; mevcut arayüz ve iyzico.ts hiç bozulmaz.

## Veri akışı — Stripe

```
1. Kullanıcı "Kart ile öde (Stripe)" → POST /api/payment/init { documentId, saglayici:"stripe" }
2. init: [mevcut kapılar: auth → belge/404 → sahiplik/404 → sahipsiz Case sahiplen]
        → getSaglayici("stripe").checkoutBaslat(...)
        → Stripe Checkout Session (mode:"payment", unit_amount:9900 kuruş, currency:"try",
                                    success_url, cancel_url)
        → Payment { durum:"bekliyor", saglayici:"stripe", iyzicoRef: session.id }
        → { paymentPageUrl: session.url } → tarayıcı Stripe'a yönlenir
3. Kullanıcı test kartıyla öder (4242 4242 4242 4242)
4. Stripe → POST /api/payment/webhook  (event: checkout.session.completed)
        → İMZA doğrula (STRIPE_WEBHOOK_SECRET, HAM gövde)
        → normalize: amount_total/100 = 99, "try" → "TRY"
        → [paywall kopyası]: Payment'ı iyzicoRef=session.id ile bul → idempotency
          → basarili && paidPrice===tutar && currency===PARA_BIRIMI ise
             Payment.durum="basarili" + Document.durum="odendi"
        → 200 OK
5. Tarayıcı success_url = /hesap?odeme=basarili (yalnızca UX; kilidi webhook açtı)
```

iyzico akışı bunların hiçbirine dokunmadan aynı kalır (token-retrieve + `/api/payment/callback`).

## İki kritik teknik tuzak

1. **Ham gövde:** Stripe imzası `req.json()` ile değil, `await req.text()` (ham body) ile doğrulanır (`stripe.webhooks.constructEvent`). Gövde önce parse edilirse imza tutmaz. App Router'da ham body `req.text()` ile alınır.
2. **kuruş + küçük harf:** Stripe tutarı en küçük birimdedir (99 TRY = 9900) ve para birimini küçük harf verir (`"try"`). `stripe.ts` bunu `paidPrice: 99`, `currency: "TRY"`'ye normalize eder ki mevcut `paidPrice === tutar` mantığı çalışsın. (TRY iki ondalıklı para birimidir → /100 doğru.)
3. **Lazy client:** iyzico'daki `getClient()` gibi, `new Stripe(...)` modül üst seviyesinde çağrılmaz (aksi halde `next build` anahtar ister). `getStripe()` ile lazy başlatılır.

## Şema değişikliği

```prisma
model Payment {
  id           String       @id @default(cuid())
  userId       String
  documentId   String
  tutar        Int
  durum        PaymentDurum @default(bekliyor)
  saglayici    String       @default("iyzico")  // YENİ: "iyzico" | "stripe"
  iyzicoRef    String?                           // korunur; aktif sağlayıcının referansı
  createdAt    DateTime     @default(now())
}
```

`@default("iyzico")` eski satırları geçerli tutar. iyzico'nun init yolu `saglayici`'yi set etmese bile default uygulanır; Stripe yolu `saglayici:"stripe"` yazar.

Migration: `docker compose -f docker-compose.dev.yml run --rm app npx prisma migrate dev --name payment_saglayici`, ardından `build app` (CLAUDE.md: şema değişikliği → imaj rebuild).

## Ortam değişkenleri

`.env.example`'a eklenir:

```
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

Publishable key **gerekmez** (hosted Checkout'a yönlendiriyoruz, client-side Stripe.js yok).

## Yerel geliştirme (webhook)

```
stripe login
stripe listen --forward-to localhost:37429/api/payment/webhook
# → verdiği whsec_... değerini .env'e STRIPE_WEBHOOK_SECRET olarak koy
```
Test kartı: `4242 4242 4242 4242`, ileri bir son kullanma, herhangi CVC. Sabit port: 37429.

## Bağımlılık

`docker compose -f docker-compose.dev.yml run --rm app npm install stripe` (package.json + package-lock.json günceller — Dockerfile `npm ci` kullandığı için lock senkron olmalı) → ardından `build app` (CLAUDE.md tuzak #2: yeni paket imaja bake edilmeli).

## Frontend

`src/app/hesap/page.tsx` ve `src/components/DocumentPreview.tsx`: mevcut tek "öde" butonunun yanına ikinci seçenek. İki buton:
- **"İyzico ile öde"** → init gövdesi `{ documentId }` (veya `saglayici:"iyzico"`)
- **"Kart ile öde (Stripe)"** → init gövdesi `{ documentId, saglayici:"stripe" }`

Her ikisi de dönen `paymentPageUrl`'e `window.location.href` ile gider (mevcut davranış). Parametre yokluğunda backend default iyzico olduğundan, eski çağrılar bozulmaz.

## Test planı

Mock deseni CLAUDE.md konvansiyonu: `vi.hoisted()` + `vi.mocked()` + `beforeEach(vi.clearAllMocks())`. Dış sınırlar mock'lanır (`stripe`, `@/lib/db`, provider'lar).

- **`src/lib/payment/stripe.test.ts`**
  - `checkoutBaslat`: Checkout Session doğru parametrelerle kuruluyor (unit_amount 9900, currency "try", success/cancel_url); `{ paymentPageUrl, token }` dönüyor.
  - `webhookDogrula`: geçerli imza → event parse; `amount_total 9900 → paidPrice 99`, `"try" → "TRY"`; bozuk imza → hata/`basarili:false`.
- **`src/app/api/payment/webhook/route.test.ts`**
  - Bozuk imza → 400, belge açılmaz.
  - `checkout.session.completed` + eşleşen tutar → `Document.durum="odendi"`.
  - Idempotency: zaten `basarili` → çift işlem yok.
  - Tutar uyuşmazlığı → belge **açılmaz** (paywall assert'i: yanıt/DB'de belge kilidi kalır).
- **`src/app/api/payment/init/route.test.ts`** (güncelle)
  - `saglayici:"stripe"` → Stripe provider çağrılıyor, Payment `saglayici:"stripe"`.
  - Parametresiz → hâlâ iyzico (mevcut davranış korunur).
- **iyzico testleri** (`iyzico.test.ts`, `callback/route.test.ts`): değişmeden yeşil kalır = "bozmadık" kanıtı.

## Kapsam dışı (YAGNI)

- Canlı (production) Stripe hesabı / payout (Türkiye kısıtı) — ileride ele alınacak.
- Publishable key / client-side Stripe Elements.
- iyzico'nun kaldırılması veya refactor'ı.
- `iyzicoRef` → `saglayiciRef` yeniden adlandırması.
- Abonelik / tekrarlayan ödeme (yalnızca tek seferlik `mode:"payment"`).
