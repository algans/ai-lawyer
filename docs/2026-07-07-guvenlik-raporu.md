# Güvenlik Tarama Raporu — ai-lawyer

- **Tarih:** 2026-07-07
- **Metodoloji:** skillgen `security-scan` 7 adımı (proje analizi → bağımlılık denetimi → kod taraması → config taraması → raporlama → düzeltme → güvenlik kuralları)
- **Kapsam:** Next.js 15 App Router / React 19 / Prisma / Anthropic SDK / iyzipay / jose (JWT) / bcryptjs / zod — 14 API rotası, AI hattı, ödeme, auth, config
- **Doğrulama:** Tüm düzeltmeler TDD (RED → GREEN) ile yapıldı. **169/169 test yeşil, `tsc --noEmit` temiz** (Docker konteynerinde koşuldu).
- **Durum:** CRITICAL + tüm HIGH + tüm MEDIUM **düzeltildi**. LOW/INFO maddeleri ve iki residual takip için açık.

---

## Özet tablo

| # | Önem | Bulgu | Durum | Dosya |
|---|------|-------|-------|-------|
| C1 | 🟥 CRITICAL | `SESSION_SECRET` tanımsızken boş-anahtar token forgery | ✅ Fixlendi | `src/lib/auth.ts` |
| H1 | 🟧 HIGH | `/api/auth/login` rate-limit yok → brute-force | ✅ Fixlendi | `src/app/api/auth/login/route.ts` |
| H2 | 🟧 HIGH | `/api/chat` sahiplik kontrolü yok (IDOR) | ✅ Fixlendi | `src/app/api/chat/route.ts` |
| M1 | 🟨 MEDIUM | `/api/form-fields` POST ücretli `classify` DoS | ✅ Fixlendi | `src/app/api/form-fields/route.ts` |
| M2 | 🟨 MEDIUM | Kullanıcı enumerasyonu (login timing + register 409) | ✅ Fixlendi* | `src/lib/auth.ts`, `.../auth/register/route.ts` |
| M3 | 🟨 MEDIUM | `x-forwarded-for` ham güvenilerek rate-limit anahtarı | ✅ Fixlendi* | `src/lib/ratelimit.ts` |
| M4 | 🟨 MEDIUM | Güvenlik başlıkları yok (CSP/HSTS/X-Frame-Options…) | ✅ Fixlendi* | `next.config.ts` |
| L1 | 🟦 LOW | Zayıf parola politikası (register min 6) | ⏳ Açık | — |
| L2 | 🟦 LOW | Bağımlılık açıkları (critical/high dev-only) | ⏳ Açık | — |
| I1–I3 | ⬜ INFO | iyzico placeholder alıcı, maskPreview ilk paragraf, anonim vaka sahiplenme | ⏳ By-design | — |

\* Residual/takip notu için ilgili bölüme bakın.

---

## Düzeltilen bulgular (detay)

### C1 🟥 — Taklit edilebilir oturum tokenı
**Sorun:** `SESSION_SECRET` gerçek `.env`'de tanımsızdı; `secret()` `TextEncoder().encode(undefined)` ile **0 baytlık anahtar** üretiyordu ve `jose` HS256'yı boş anahtarla imzalayıp doğruluyordu. Sırra gerek olmadan herhangi bir kullanıcının hesabı ele geçirilebilir + paywall aşılabilir (konteynerde kanıtlandı: forged `userId` kabul edildi).

**Düzeltme:** `secret()` içine fail-fast doğrulama — `SESSION_SECRET` yok veya `< 32` karakterse `throw`. Kontrol **çağrı anında** (modül üst seviyesinde değil) yapılır ki `next build` kırılmasın (iyzico lazy-init dersi). `.env`'e 48 karakterlik güçlü secret eklendi. İmzalama artık boş anahtarla asla çalışmaz; misconfig'te login **gürültülü** hata verir, doğrulama tarafı güvenli şekilde tüm oturumları reddeder.

**Test:** `src/lib/auth.test.ts` — secret yok/kısa iken `oturumTokeni` reddediyor.

### H1 🟧 — Login brute-force
**Düzeltme:** IP başına 10 deneme / 15 dk (`login:${istekAnahtari(req)}` bucket'ı), kimlik kontrolünden önce. **Test:** `login/route.test.ts` [429].

### H2 🟧 — Chat IDOR
**Sorun:** `/api/chat` mevcut-vaka dalı, mesajı **sahiplik doğrulamadan** yazıyordu; `generate` ve `form-fields` bu kapıya sahipti, chat değildi.
**Düzeltme:** Mesaj yazılmadan **önce** vaka çekilir, varlık + sahiplik doğrulanır (`kayit.userId && (!oturum || oturum.userId !== kayit.userId)` → 404). **Test:** `chat/route.test.ts` [404] IDOR guard.

### M1 🟨 — form-fields maliyet-DoS
**Düzeltme:** `oturum` öne alındı; ücretli `classify` çağrısından **önce** rate-limit (anon 20/gün, girişli 100/gün). **Test:** `form-fields/route.test.ts` [429].

### M2 🟨 — Kullanıcı enumerasyonu
**Düzeltme:**
- **Login timing:** `dogrulaParolaSabitZaman` — kullanıcı yoksa da dummy hash ile bir bcrypt karşılaştırması çalıştırılır → yanıt süresi eşitlenir. bcrypt her durumda `!user` dallanmasından **önce** koşar (timing sızıntısı yok, tsc narrowing korunur).
- **Register:** IP başına 10 deneme/saat rate-limit → toplu enumerasyon sınırlandı.

**Residual:** Register hâlâ 409 "Bu e-posta zaten kayıtlı" döndürüyor (varlık oracle'ı). Tam çözüm e-posta doğrulama akışı gerektirir (ürün kararı); rate-limit ile şimdilik sınırlandı. **Test:** `login/route.test.ts` (sabit-zaman), `register/route.test.ts` [429].

### M3 🟨 — x-forwarded-for sertleştirme
**Düzeltme:** `istekAnahtari` artık trusted-proxy-aware. Girişli kullanıcı zaten `u:${userId}` (spoof-proof). Anonim IP, ham header yerine `GUVENILEN_PROXY_SAYISI` ortam değişkenine göre parse edilir: proxy varsa header'ın sonundan o kadar geriden gerçek istemci IP'si alınır, yoksa tek IP'ye normalize edilir (best-effort).

**Residual/prod:** Caddy arkasında `GUVENILEN_PROXY_SAYISI=1` set edilmeli (`.env.example`'a eklendi, default `0`). Proxy olmadan anonim IP tam spoof-proof olamaz (altyapı bağımlı). **Test:** `ratelimit.test.ts` — trusted/untrusted senaryoları.

### M4 🟨 — Güvenlik başlıkları
**Düzeltme:** `next.config.ts` `headers()` ile: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` (HSTS), `Permissions-Policy`.

**Residual/doğrulama:** `headers()` standart Next API (emisyon kesin). CSP, App Router satır-içi script'leri için `'unsafe-inline'/'unsafe-eval'` içerir (nonce altyapısı yok) ama `object-src/base-uri/form-action/frame-ancestors` ile anlamlı savunma sağlar. **CSP'nin SPA render'ını kırmadığı tarayıcıda henüz doğrulanmadı** (tarama sırasında Docker daemon disk-dolu olayından sonra bozuldu). Doğrulama:
```bash
./run.sh start && curl -I http://localhost:37429/
```
CSP sorun çıkarırsa tek satır ayar; diğer 5 başlık %100 güvenlidir.

---

## Henüz ele alınmayan bulgular

- **L1 — Zayıf parola politikası:** register min 6, login min 1; karmaşıklık/breach kontrolü yok.
- **L2 — Bağımlılık açıkları:** `npm audit` → 11 (1 critical, 1 high, 9 moderate). **Critical/high'ın hepsi dev-only** (`vitest`, `vite`, `esbuild`, `@vitest/mocker`, `vite-node`) — prod bundle'a girmez. Prod-runtime ilgili tek zincir: `iyzipay → postman-request → qs (DoS)/uuid (bounds)` ve build-zamanı `next → postcss (XSS)`.
- **I1 — iyzico placeholder alıcı verisi** (`identityNumber: "11111111111"`, sabit ip/isim) — prod/KVKK için gerçek veri şart.
- **I2 — `maskPreview` ilk paragrafı tam gösterir** — önizleme için tasarım gereği.
- **I3 — Anonim vaka sahiplenme** (`payment/init`) — tasarım gereği.

---

## Sağlam bulunan kontroller (regresyona karşı koru)

- **Paywall invariant sağlam:** `document/[id]` + `download` sahiplik + `odendi` kapısı; `/cases` allow-list (`icerik` seçmez); `/generate` yalnızca `maskPreview`.
- **Ödeme callback'i sunucu-taraflı doğrulama:** `retrieve` + tutar + currency + idempotency.
- **Prompt injection sarma** her AI çağrısında (`classifier`/`collector`/`generator`).
- **Çerezler:** `httpOnly` + `sameSite=lax` + prod'da `secure`.
- **Injection yüzeyi temiz:** ham SQL yok (Prisma parametreli), `dangerouslySetInnerHTML`/`eval`/`child_process` yok.
- **Sır sızıntısı yok:** `.env` git-ignored; `.dockerignore` `.env` + `.git` hariç tutar.

---

## Doğrulama kaydı

```
docker compose -f docker-compose.dev.yml up -d db
docker compose -f docker-compose.dev.yml run --rm app npm test     # 169/169 passed (28 dosya)
docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit   # temiz
```

**Açık takip:** M4 canlı header/CSP smoke (Docker daemon toparlanınca), M2 register enumeration (e-posta doğrulama akışı), M3 prod `GUVENILEN_PROXY_SAYISI`, L1/L2 ve INFO maddeleri.
