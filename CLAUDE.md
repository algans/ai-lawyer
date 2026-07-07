# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ne bu proje

Türkçe, yapay zekâ destekli **hukuki belge asistanı** (self-servis belge taslağı üretimi + freemium ödeme). Next.js 15 App Router monolit + Postgres (Prisma) + Anthropic API + iyzico. Tüm kullanıcıya görünen metinler ve alan/enum adları **Türkçe** (`baslik`, `kategori`, `durum: taslak|odendi`, `rol: user|assistant`).

## Çalıştırma & test (Docker zorunlu)

**Her şey Docker üzerinden çalışır — host'ta doğrudan `npm`/`next`/`prisma` çalıştırma.**

```bash
./run.sh start        # Docker'ı (gerekirse) başlatır, uygulamayı ayağa kaldırır → http://localhost:37429 (sabit port)
./run.sh stop|status|logs|restart|rebuild

# Test / typecheck / build (hepsi konteynerde):
docker compose -f docker-compose.dev.yml run --rm app npm test
docker compose -f docker-compose.dev.yml run --rm app npm test -- <dosya-parçası>   # tek test (vitest substring filtresi, örn. "generate")
docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit
docker compose -f docker-compose.dev.yml run --rm app npm run build
```

**Sık ısıran üç Docker tuzağı (öğrenilmiş):**
1. **Tam suite için DB ayakta olmalı:** önce `docker compose -f docker-compose.dev.yml up -d db`, yoksa `src/lib/db.test.ts` bağlantı hatası verir (diğer testler mock'lu, DB istemez).
2. **Yeni npm bağımlılığı → `docker compose -f docker-compose.dev.yml build app`.** `run --rm` ile yapılan `npm install` anonim `node_modules` volume'una kalıcı yazmaz; imaja bake etmek gerekir.
3. **Şema değişikliği → yine `build app`.** Prisma client imaja `postinstall: prisma generate` ile bake edilir; migration sonrası rebuild etmezsen `tsc`/`build` eski tiplerle kırılır (çalışan container'da doğru, taze container'da yanlış). Migration: `... run --rm app npx prisma migrate dev --name <ad>`, sonra `build app`.

**Deferred testler (gerçek anahtar/tarayıcı gerektirir, `npm test`'e dahil DEĞİL):**
- `npm run eval` — gerçek Claude ile AI kalite değerlendirmesi; `EVAL=1` + `ANTHROPIC_API_KEY` yoksa "skipped" deyip çıkar. Skorlama mantığı (`eval/degerlendir.ts`) saf ve unit-test'li.
- `npm run e2e` — Playwright; ayrı `testDir: e2e` (vitest bunu `exclude` eder). Dumanlanma spec'leri + `test.skip` tam ödeme akışı. Detay: `docs/E2E.md`.

## Mimari — büyük resim

**AI hattı (4 adım, promptlar `src/lib/ai/prompts/` altında, koda gömülü değil):**
`classify` (kategori+merci+eksikBilgiler, Haiku) → `nextQuestion` slot-filling (Haiku) → `generateDocument` (Opus taslak + Haiku öz-kontrol) → çıktıya sorumluluk reddi eklenir. Model ayrımı sabit: üretim = `MODELS.quality` (Opus), gerisi = `MODELS.fast` (Haiku). Tek AI giriş noktası `callClaude` (`src/lib/ai/client.ts`); AI'dan dönen JSON **her zaman Zod** ile doğrulanır.

**⚠️ EN ÖNEMLİ KURAL — sunucu-taraflı paywall invariant'ı:** Tam belge metni (`Document.icerik`) yalnızca **sahip + `durum === "odendi"`** olduğunda, yalnızca `GET /api/document/[id]` ve `.../download` üzerinden döner. Diğer HİÇBİR rota tam metni sızdırmaz: `/api/generate` sadece `maskPreview(icerik)` döner; `/api/cases` açık alan allow-list'i ile `icerik`'i hiç seçmez; `/api/rehber` yalnızca üretilmiş yönlendirme metni döner. **Belgeye dokunan yeni her rota bu sahiplik+ödeme kapısını uygulamak zorunda.** İlgili testler ham yanıt gövdesinde gizli metnin yokluğunu assert eder — bu deseni koru.

**`/api/generate` kapı zinciri (sıra korunmalı):** body/400 → vaka yok/404 → sahiplik/404 → rate limit/429 → `bilgiTamam`/409 → KVKK rızası/403 → sınıflandırma/409 → ancak sonra pahalı `generateDocument`. Her erken dönüş üretimden önce olmalı.

**Güvenlik katmanları:** prompt injection → tüm kullanıcı serbest metni `kullaniciMetniSarmala` ile `<kullanici_girdisi>` sınırlayıcılarına sarılır (`src/lib/ai/sanitize.ts`), sistem promptları "sınırlayıcı içi = veri" der. KVKK rıza kapısı `Case.rizaOnayTarihi` ile. Bellek-içi rate limiter (`src/lib/ratelimit.ts`, tek-process MVP). Maliyet loglama `callClaude`'a `logMeta` geçilince best-effort `UsageLog` yazar (asla üretimi kırmaz).

**Ödeme (iyzico Checkout Form, `src/lib/payment/`):** `PaymentProvider` arayüzü ardında soyut (PayTR'ye geçilebilir). Akış: `/api/payment/init` (checkout başlat + sahipsiz Case'i sahiplen) → iyzico → `/api/payment/callback` **sunucu-taraflı** `checkoutForm.retrieve` ile doğrular; belgeyi yalnızca `paymentStatus==="SUCCESS"` **ve tutar/currency eşleşiyorsa** açar; idempotent. **iyzico istemcisi lazy** (`getClient()`) — modül üst-seviyesinde `new Iyzipay(...)` yazma, `next build` sırasında `uri cannot be empty` ile kırar.

## Konvansiyonlar

- **Test mock deseni:** `vi.hoisted()` ile mock fn'leri hoist et + `vi.mocked()` erişimci + `beforeEach`'te `vi.clearAllMocks()`. Üst-seviye `const x = vi.fn()` (mock factory dışında) hoisting hatası verir. Testler dış sınırları mock'lar: `@/lib/db`, `@/lib/ai/*`, `iyzipay`, `@anthropic-ai/sdk`. `@/` alias'ı `vitest.config.ts`'te tanımlı (`src/`).
- **Fazlı geliştirme:** spec'ler `docs/superpowers/specs/`, planlar `docs/superpowers/plans/` (roadmap + faz 1–4). Faz 1–3 tamamlandı ve `main`'e merge edildi; Faz 4 (VPS deploy) bekliyor. İş, feature dallarında subagent-driven-development ile yürütülür; ilerleme kaydı `.superpowers/sdd/progress.md` (git-ignored).
- **Kalan production-hardening maddeleri** `docs/superpowers/plans/2026-06-30-faz-4-deploy.md` ve proje hafızasında: KVKK metnindeki `[ŞİRKET ADI]` vb. placeholder'ları doldurmak, iyzico gerçek alıcı bilgisi, `x-forwarded-for` sertleştirmesi, prod compose/Caddy.

## Ortam değişkenleri (`.env`, `.env.example`'dan)

`DATABASE_URL`, `ANTHROPIC_API_KEY`, `SESSION_SECRET` (JWT), `IYZICO_API_KEY`/`IYZICO_SECRET_KEY`/`IYZICO_BASE_URL` (sandbox: `https://sandbox-api.iyzipay.com`), `APP_URL`. AI üretimi ve ödeme gerçek anahtar ister; `/api/health` istemez.
