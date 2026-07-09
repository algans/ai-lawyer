# Hukuki Asistan — Mobil (Expo)

Web uygulamasının **serbest mod** (sohbet) MVP'si. Expo Router (SDK 57) + TypeScript.
Mevcut Next.js REST API'nin ince istemcisidir; kendi backend'i yoktur.

## Akış

Sohbet (anonim başlar) → soru-cevap ile bilgi toplama → KVKK onayı + "Belgeyi Oluştur"
→ maskeli Önizleme + paywall → "Öde ve indir" → (giriş gerekli) → sağlayıcı checkout (in-app tarayıcı)
→ ödeme onayı → belge kilidi açılır → PDF/Word indir.

## Çalıştırma

> Not: Bu makinede Node 22 fnm ile gelir; Expo LTS ister. Komutları `fnm exec --using=22 -- ...` ile
> koşun veya `fnm use 22` yapın. (Sistemdeki Node 25 Expo araçlarını uyarabilir.)

```bash
cd mobile
npm install
npx expo start            # çıkan QR'ı Expo Go ile okutun (SDK 57 destekleyen Expo Go gerekir)
```

Varsayılan backend: `https://ai-hukuki-asistan.fly.dev`.
Farklı backend için:

```bash
EXPO_PUBLIC_API_URL=https://baska-backend npx expo start
```

## Ön koşul

Backend'e **token-auth değişikliği** (Bearer + login/register yanıtında token) DEPLOY edilmiş olmalı;
aksi halde giriş, ödeme ve Belgelerim adımları 401 verir. (Anonim sohbet + önizleme deploy olmadan da çalışır.)

## Test / doğrulama

```bash
npm test                  # lib birim testleri (api, token) — jest-expo
npx tsc --noEmit          # tip kontrolü (test dosyaları hariç; onlar jest ile doğrulanır)
npx expo export --platform ios   # Metro bundle smoke testi (import/route çözümü)
```

## Yapı

```
src/
  app/
    _layout.tsx              # fontlar + AuthProvider + SafeArea + Stack
    (tabs)/
      _layout.tsx            # alt sekme: Sohbet · Belgelerim · Hesap
      index.tsx              # Sohbet (çekirdek)
      belgelerim.tsx         # /api/cases
      hesap.tsx              # giriş/çıkış
    onizleme/[documentId].tsx# önizleme + paywall sheet
    giris.tsx, kayit.tsx     # token tabanlı auth (modal)
  components/                # Button, Field, Banner, GreenHeader, ChatBubble, TypingDots, RizaOnay, DocPreview, PaywallSheet
  lib/
    api.ts                   # fetch sarmalayıcı (Bearer enjekte)
    auth.tsx                 # AuthContext
    token.ts                 # SecureStore
    theme.ts                 # tasarım tokenları (web globals.css portu)
    config.ts, types.ts, odeme.ts, preview-cache.ts
```

## Tasarım

Versiyon B (native): yeşil başlık + altın çizgi, alt sekme çubuğu, mint tonlu asistan balonları,
bottom-sheet paywall. Palet ve tipografi web ile birebir (Inter + Lora).

## Manuel dumanlanma listesi (Expo Go, fiziksel telefon)

1. `npx expo start` → Expo Go ile QR → uygulama 3 sekmeyle açılır.
2. Sohbet: derdini yaz → asistan soru sorar → bilgi tamamlanınca "Belgeyi Oluştur" belirir.
3. Oluştur → Önizleme, maskeli metin + "Web'de öde ve indir".
4. Öde → giriş yoksa Giriş modalı → giriş/kayıt → geri dönüş.
5. Ödeme sheet → sağlayıcı checkout (in-app tarayıcı) → sandbox kartla öde.
6. Dönüşte "Ödeme alındı" → PDF/Word indir → paylaşım sayfası açılır.
7. Belgelerim: vaka listelenir, durum rozeti doğru.
8. Hesap: çıkış → korumalı ekranlar tekrar giriş ister.
