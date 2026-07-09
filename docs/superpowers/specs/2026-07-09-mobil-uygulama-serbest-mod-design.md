# Mobil Uygulama — Serbest Mod MVP (Tasarım Dokümanı)

**Tarih:** 2026-07-09
**Durum:** Onay bekliyor
**Kapsam:** Hukuki Asistan web uygulamasının mobil (Expo/React Native) MVP'si — yalnızca **serbest mod** ile belge talebi, önizlemeye kadar uçtan uca akış.

---

## 1. Amaç ve Kapsam

Kullanıcılar mobil arayüzden **serbest modda** (sohbet ederek) belge talebi gönderebilsin. Web'deki aynı ekran formatı ve tasarım kimliği korunur, mobil-native desenlere uyarlanır.

**Uçtan uca akış:**
```
Sohbet (anonim başlar) → soru-cevap ile bilgi toplama → KVKK onayı + "Belgeyi Oluştur"
  → maskeli Önizleme + paywall → "Öde ve indir" → (giriş gerekli) → sağlayıcı checkout (in-app tarayıcı)
  → ödeme onayı → belge kilidi açılır → PDF/Word indir (native)
```

Ödeme, **sağlayıcının (iyzico/Stripe) web checkout sayfasında** gerçekleşir — uygulama içinde native ödeme UI'ı yoktur (App Store/Play IAP kuralları tetiklenmez). İndirme native olarak yapılır.

---

## 2. Alınan Kararlar

| Karar | Seçim | Gerekçe |
|------|-------|---------|
| Akış kapsamı | Önizlemeye kadar MVP | Web'de chat+generate zaten anonim; paywall sunucuda |
| Ödeme | Sağlayıcı checkout'u in-app tarayıcıda | IAP riski yok, mevcut `payment/init` kullanılır |
| Auth | Giriş/kayıt var, **token tabanlı** | Kullanıcı istedi; cookie mobilde kırılgan |
| Repo | Bu repoda `mobile/` alt dizini (monorepo) | Backend auth değişikliğini birlikte koordine et |
| Test backend | Canlı **Fly.io** (`https://ai-hukuki-asistan.fly.dev`) | Her yerden erişim, tunnel/IP derdi yok |
| Tasarım yönü | **Versiyon B — Native** | Yeşil başlık + alt sekme + bottom-sheet paywall |
| Belgelerim sekmesi | **Dahil** | `/api/cases` hazır, uygulamayı tam hissettirir |
| Test aracı | Expo Go (fiziksel telefon, QR) | Kullanıcı tercihi |

> **Doğrulanacak:** Fly.io canlı URL'si (`app = "ai-hukuki-asistan"` → varsayılan `ai-hukuki-asistan.fly.dev`). Deploy anında `APP_URL` secret'i ile teyit edilecek.

---

## 3. Mimari — Büyük Resim

Mobil uygulama, mevcut Next.js REST API'nin **ince istemcisidir**. Kendi backend'i yoktur; tüm iş mantığı ve güvenlik sunucuda kalır.

**Kritik invariant korunur:** Tam belge metni (`Document.icerik`) yalnızca sahip + `durum === "odendi"` iken, yalnızca `GET /api/document/[id]` / `.../download` üzerinden döner. Mobil istemci bu kapıyı **değiştiremez**; sadece maskeli `onizleme` metnini gösterir. Tüm risk yüzeyi, geriye dönük uyumlu tek bir auth değişikliğinde toplanır.

```
┌─────────────────────────────┐        HTTPS + Bearer JWT        ┌──────────────────────────┐
│  Expo App (React Native)    │  ─────────────────────────────► │  Next.js API (Fly.io)    │
│  - Sohbet / Önizleme / Auth │                                 │  - /api/chat  (anonim)   │
│  - SecureStore (token)      │  ◄───── JSON / maskeli metin ── │  - /api/generate (anonim)│
│  - expo-web-browser (ödeme) │                                 │  - /api/payment/init     │
│  - expo-file-system (indir) │                                 │  - /api/cases /document  │
└─────────────────────────────┘                                 │  - /api/auth/*           │
                                                                 └──────────────────────────┘
```

---

## 4. Teknoloji Yığını (hepsi Expo Go uyumlu — özel native modül yok)

| Amaç | Paket |
|------|-------|
| Çatı | **Expo (managed workflow)**, en güncel kararlı SDK |
| Navigasyon | **Expo Router** (dosya tabanlı, native tab bar) |
| Dil | TypeScript |
| Tipografi | `@expo-google-fonts/inter`, `@expo-google-fonts/lora`, `expo-font` |
| İkonlar | `@expo/vector-icons` (Feather — çizgi ikon) |
| Token saklama | `expo-secure-store` (şifreli keychain) |
| Ödeme tarayıcısı | `expo-web-browser` |
| İndirme/paylaşma | `expo-file-system`, `expo-sharing` |
| Bottom sheet | Özel — RN `Modal` + `Animated` (ekstra native bağımlılık yok) |
| Test (mobil birim) | `jest-expo` preset + `@testing-library/react-native` (yalnızca `lib/` saf mantık) |

Bilinçli olarak `@gorhom/bottom-sheet`, `reanimated`, ağır navigasyon kütüphaneleri **kullanılmaz** — Expo Go'da kırılganlığı en aza indirmek için.

---

## 5. Uygulama Yapısı & Navigasyon

```
mobile/
  app/
    _layout.tsx              # fontları yükle + AuthProvider + kök Stack
    (tabs)/
      _layout.tsx            # alt sekme çubuğu: Sohbet · Belgelerim · Hesap
      index.tsx              # Sohbet (çekirdek ekran)
      belgelerim.tsx         # Kullanıcının vakaları (/api/cases)
      hesap.tsx              # Giriş yoksa CTA; varsa e-posta + Çıkış
    onizleme/[documentId].tsx# Önizleme + paywall sheet
    giris.tsx                # Giriş (modal sunum)
    kayit.tsx                # Kayıt (modal sunum)
  components/
    ChatBubble.tsx           # asistan (mint) / kullanıcı (yeşil) balonu
    TypingDots.tsx           # "yazıyor" animasyonu
    RizaOnay.tsx             # KVKK onay kutusu + "Belgeyi Oluştur"
    DocPreview.tsx           # maskeli belge kartı
    PaywallSheet.tsx         # alttan açılan ödeme sheet'i
    Field.tsx, Button.tsx, Banner.tsx, GreenHeader.tsx
  lib/
    api.ts                   # fetch sarmalayıcı: baseURL + Bearer enjekte + hata normalize
    auth.tsx                 # AuthContext (token, kullanıcı durumu) + SecureStore
    theme.ts                 # tasarım tokenları (globals.css portu)
    types.ts                 # API yanıt tipleri (Msg, Case, vb.)
  app.config.ts              # EXPO_PUBLIC_API_URL (varsayılan Fly.io)
  package.json, tsconfig.json, .gitignore
```

**Navigasyon akışı:** Sohbette `tamamlandi=true` olunca satır-içi KVKK onayı + "Belgeyi Oluştur" görünür. `generate` başarılı olunca `onizleme/[documentId]`'ye gidilir. Maskeli `onizleme` metni yalnızca `generate` yanıtında bulunur (taslak belgenin `GET`'i 402 döner), bu yüzden metin navigasyon parametresi olarak — büyükse modül-içi hafif cache (documentId→onizleme) ile — taşınır; asla yeniden üretim yapılmaz. Paywall sheet'te "Öde ve indir": giriş yoksa `giris` modalına yönlendirir; girişliyse ödeme akışını başlatır.

`mobile/` dizini **`.dockerignore`'a eklenir** → backend Docker imajı etkilenmez.

---

## 6. Ekranlar (Versiyon B — Native)

### 6.1 Sohbet (`(tabs)/index.tsx`) — çekirdek
- Yeşil başlık (`--green-900` + altın alt çizgi): "Derdinizi Anlatın" + alt metin.
- Mesaj listesi: asistan balonları mint tonlu + terazi avatarı (sol); kullanıcı balonları yeşil (sağ). "Yazıyor" animasyonu.
- Alt: mesaj giriş çubuğu (yuvarlak input + yeşil gönder butonu).
- `tamamlandi` olunca `RizaOnay` bileşeni belirir; onaylanınca `generate` çağrılır.
- Anonim çalışır; `caseId` istemci state'inde tutulur.

### 6.2 Önizleme (`onizleme/[documentId].tsx`)
- Başlık: "Önizleme" + "Taslak — kilitli" rozeti.
- `DocPreview`: maskeli metni gösterir (sunucudan gelen `onizleme` — tam metin asla inmez).
- `PaywallSheet` alttan açılır: "Web'de öde ve indir — 99 TL" + "Daha sonra". Güvenli ödeme notu.

### 6.3 Belgelerim (`(tabs)/belgelerim.tsx`)
- Girişliyse `GET /api/cases` → vaka kartları (başlık, kategori, tarih, belge durumu).
- Girişsizse "Giriş yapın" boş durumu.
- Bir vakada `odendi` belge varsa "İndir"; `taslak` varsa "Önizlemeye dön".

### 6.4 Hesap (`(tabs)/hesap.tsx`)
- Girişsiz: "Giriş Yap" / "Kayıt Ol" CTA'ları.
- Girişli: e-posta + "Çıkış Yap".

### 6.5 Giriş (`giris.tsx`) / Kayıt (`kayit.tsx`)
- Yeşil hero başlık + beyaz form kartı. E-posta + parola alanları, hata bannerı.
- Başarıda token SecureStore'a yazılır, geri dönülür (varsa bekleyen ödeme akışı devam eder).

---

## 7. Tasarım Sistemi Portu (`theme.ts`)

`src/app/globals.css` tokenları birebir taşınır (palet değişmez):

```ts
export const renk = {
  bg: "#F6F9F7", ink: "#0F1E17", muted: "#5A6B63", faint: "#8a9790",
  border: "#DCE7E1", green900: "#0A2C21", green800: "#0E3B2E", green700: "#14513D",
  green600: "#1B6B4C", green500: "#22855E", mint: "#E7F1EC", mintBg: "#F2F8F5",
  gold: "#C6A15B", goldLight: "#E7CE97", success: "#12855A", error: "#B42318",
  draftBg: "#FBF3E1", draftInk: "#B07A12",
};
export const font = { govde: "Inter", baslik: "Lora" };
```

Web'in bileşen davranışları (balon, buton, onay kutusu, paywall) native karşılıklarına çevrilir; ölçüler mobil dokunma hedeflerine (min 44pt) uyarlanır.

---

## 8. API Entegrasyonu (mevcut uçlar — değişmeden tüketilir)

| Ekran / eylem | Uç | Auth | Dönen |
|------|-----|------|-------|
| Sohbet | `POST /api/chat` | anonim | `caseId`, `cevap`, `tamamlandi` |
| Belge oluştur | `POST /api/generate` `{caseId, rizaOnay}` | anonim | `documentId`, `onizleme` (maskeli) |
| Ödeme başlat | `POST /api/payment/init` `{documentId, saglayici}` | **Bearer** | `paymentPageUrl` |
| Belgelerim | `GET /api/cases` | **Bearer** | `cases[]` |
| Belge durumu | `GET /api/document/[id]` | **Bearer** | `icerik` (yalnız `odendi`) |
| İndir | `GET /api/document/[id]/download?format=pdf\|docx` | **Bearer** | binary |
| Giriş | `POST /api/auth/login` `{email, parola}` | — | `userId`, **`token`** (yeni) |
| Kayıt | `POST /api/auth/register` `{email, parola, ad?}` | — | `userId`, **`token`** (yeni) |
| Çıkış | `POST /api/auth/logout` | — | — |

---

## 9. Backend Değişiklikleri (tek dokunulan yer — TDD)

Mobil, cookie yerine `Authorization: Bearer <jwt>` gönderecek. Tüm korumalı rotalar tek kapıdan (`oturumCurrentUser`) geçtiği için değişiklik minimaldir ve **geriye dönük uyumludur**.

1. **`src/lib/auth.ts` → `oturumCurrentUser(req)`**: cookie yoksa `Authorization` başlığındaki `Bearer <token>`'ı `oturumDogrula` ile doğrula. Web davranışı (cookie) aynen korunur.
2. **`src/app/api/auth/login/route.ts` + `register/route.ts`**: yanıt gövdesine `token` alanı ekle (cookie ayarı da kalır). JWT gövdede dönmesi native istemci için standart; token `SecureStore`'da şifreli saklanır.
3. **Testler** (`src/lib/auth.test.ts` + rota testleri): (a) Bearer header ile `oturumCurrentUser` kullanıcıyı çözer, (b) cookie yokken Bearer çalışır, (c) login/register yanıtı `token` içerir, (d) geçersiz Bearer → null. Mevcut 169 test kırılmamalı.

> **CORS notu:** React Native `fetch` tarayıcı CORS'una tabi değildir (native'de `Origin` zorlaması yok) → ek CORS yapılandırması gerekmez.

---

## 10. Auth & Token Akışı

```
login/register → { token } → SecureStore.setItemAsync("oturum_token", token)
api.ts her istekte: Authorization: Bearer <SecureStore token>  (varsa)
uygulama açılışı → token'ı oku → AuthContext'e koy → korumalı ekranlar açılır
çıkış → SecureStore sil + POST /logout
```
Anonim sohbet giriş istemez. Giriş yalnızca ödeme adımında zorunlu; "Öde ve indir"e basıldığında token yoksa `giris` modalına yönlendirilir, giriş sonrası ödeme akışına dönülür.

---

## 11. Ödeme & İndirme Köprüsü (mobil)

Web oturumu köprülemeye **gerek yok** — ödeme sağlayıcı-barındırmalı sayfada olur:

```
1. Kullanıcı "Öde ve indir"e basar (girişli).
2. App → POST /api/payment/init (Bearer) → paymentPageUrl (iyzico/Stripe checkout).
3. App → WebBrowser.openBrowserAsync(paymentPageUrl).
4. Kullanıcı sağlayıcı sayfasında öder → sağlayıcı → /api/payment/callback
   (sunucu retrieve ile doğrular, tutar/currency eşleşirse durum=odendi, idempotent).
5. Tarayıcı kapanır → App → GET /api/document/[id] (Bearer) ile durumu yoklar.
6. odendi ise → "Belgeyi indir (PDF/Word)": fetch /download?format=… (Bearer)
   → expo-file-system ile yaz → expo-sharing ile aç/paylaş.
```

Ödeme başarısızsa önizleme + paywall'a dönülür, hata bannerı gösterilir.

---

## 12. Ortam & Yapılandırma

- `app.config.ts` → `extra.apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "https://ai-hukuki-asistan.fly.dev"`.
- Backend auth değişikliği **önce deploy edilir**, sonra Expo Go testi yapılır (mobil canlıya bağlanır).
- `mobile/.gitignore`: `node_modules`, `.expo`, build çıktıları.

---

## 13. Test Stratejisi

- **Backend:** yeni Bearer/token birim + rota testleri (vitest, mevcut mock deseni). `npm test` yeşil kalmalı.
- **Mobil birim:** `lib/` saf mantığı için Jest — token saklama sarmalayıcısı, `api.ts` Bearer enjeksiyonu ve hata normalize, tip guard'ları. UI render testi minimal.
- **Manuel:** Expo Go ile fiziksel telefonda tam akış (sohbet → önizleme → sandbox ödeme → indirme). iyzico sandbox test kartı kullanılır.

---

## 14. Kapsam Dışı (YAGNI)

Adım-adım form modu · push bildirim · offline/senkron · native ödeme (IAP) · biyometrik giriş · çoklu dil · mağaza yayını (TestFlight/Play). Sonraki fazlara bırakılır.

---

## 15. Riskler & Açık Maddeler

- **Canlı Fly.io testi:** test verisi gerçek DB'ye yazılır (anonim/test vakalar). Kabul edilebilir; gerekirse periyodik temizlik.
- **Fly.io URL doğrulama:** deploy anında gerçek URL teyit edilecek.
- **Sağlayıcı callback → app dönüşü:** `WebBrowser` kapandığında durum yoklama (polling) ile çözülür; deep-link şart değil ama ileride eklenebilir.
- **Expo SDK sürüm sabitleme:** kurulumda güncel kararlı SDK sabitlenir; tüm bağımlılıklar o SDK ile uyumlu seçilir.

---

## 16. Bitti Tanımı (Definition of Done)

1. `mobile/` Expo projesi çalışır, Expo Go QR ile fiziksel telefonda açılır.
2. Anonim sohbet → soru-cevap → belge oluşturma → maskeli önizleme çalışır.
3. Giriş/kayıt token tabanlı çalışır; token SecureStore'da.
4. Paywall → sağlayıcı checkout → ödeme sonrası kilit açılır → PDF/Word indirilir.
5. Belgelerim girişli kullanıcının vakalarını listeler.
6. Backend auth değişikliği geriye dönük uyumlu; `npm test` (169+) yeşil.
7. Tasarım Versiyon B kimliğine sadık (yeşil başlık, sekme çubuğu, mint balonlar, bottom-sheet paywall).
