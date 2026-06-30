# AI Hukuki Belge Asistanı — Tasarım Dokümanı (Spec)

**Tarih:** 2026-06-30
**Durum:** Onaylandı (brainstorming tamamlandı)
**Sonraki adım:** Implementation plan (writing-plans)

---

## 1. Özet

Kullanıcıların hukuki dertlerini serbestçe anlattığı, AI'ın derdi anlayıp **doğru belge tipini** (şikayet/ihbar/savcılık dilekçesi vb.) ve **doğru mercii** belirleyerek hukuki belge taslağı ürettiği bir self-servis web uygulaması.

**Konumlandırma:** Self-servis belge aracı. Avukatlık danışmanlığı verilmez. Kullanıcıya genel bilgi + belge taslağı sunulur; **sorumluluk kullanıcıdadır** (net sorumluluk reddi ile). Hukuki altyapı/ruhsat ileride çözülecek; MVP en düşük yasal riskli modelle kurulur.

---

## 2. Temel Kararlar (Brainstorming Çıktısı)

| Konu | Karar |
|------|-------|
| Hukuki model | Self-servis belge aracı; sorumluluk kullanıcıda |
| Giriş modları | İki mod: (1) Serbest chatbot, (2) Akıllı form hibrit — kullanıcı seçer |
| MVP kapsam (kategoriler) | Tüketici/alışveriş, Suç ihbarı/savcılık, Kamu/idare şikayeti, Kira/komşu/iş |
| Geliştirme sırası | Motor genişletilebilir; Tüketici ile başla, diğer kategorileri sırayla ekle |
| Gelir modeli | Freemium hibrit — önizleme bedava, tam belge + gelişmiş özellikler ücretli |
| Paywall konumu | Önizlemeden sonra (kullanıcı değeri görür, sonra öder) |
| Kayıt | Ücretsiz ve her zaman açık; ödemenin arkasına kilitlenmez. En geç indirmede giriş gerekir |
| Ödeme sağlayıcı | iyzico (alternatif PayTR — SDK soyutlamasıyla değiştirilebilir) |
| AI üretim yaklaşımı | **Yaklaşım A**: Saf LLM üretimi (şablonsuz). İleride şablona (B) geçiş kodu değiştirmeden mümkün |
| Teknoloji | Next.js (TypeScript) + Postgres (Prisma) |
| Geliştirme/Test ortamı | Tamamen Docker (docker-compose.dev.yml, hot-reload) |
| Deploy hedefi | Kullanıcının kendi VPS sunucusu (Docker Compose + Caddy + SSL). SSH ileride verilecek |

---

## 3. Genel Mimari

Next.js + Postgres monolit, Docker ile paketlenmiş.

```
┌─────────────────────────────────────────────┐
│  Next.js App (TypeScript)                     │
│                                               │
│  Frontend (React)                             │
│   • Landing + giriş modları (chat / form)     │
│   • Belge önizleme + paywall                  │
│   • Hesap / belge geçmişi                     │
│                                               │
│  API Routes (backend)                         │
│   • /api/chat      → Claude konuşma           │
│   • /api/generate  → belge üretimi + öz-kontrol│
│   • /api/payment   → iyzico webhook           │
│   • /api/auth      → kullanıcı oturumu        │
└───────┬─────────────┬──────────────┬─────────┘
        │             │              │
   ┌────▼───┐   ┌─────▼─────┐   ┌────▼────┐
   │Postgres│   │Claude API │   │ iyzico  │
   │(Prisma)│   │(Opus/Haiku)│  │ ödeme   │
   └────────┘   └───────────┘   └─────────┘
```

---

## 4. Fazlar

| Faz | İçerik | Çıktı |
|-----|--------|-------|
| **Faz 0** | Analiz & planlama | Spec (bu dosya) + implementation plan |
| **Faz 1** | Çekirdek: chat + form + belge üretimi + önizleme | Çalışan ama ödemesiz prototip |
| **Faz 2** | Auth + ödeme (iyzico) + belge geçmişi + PDF | Para kazanabilir ürün |
| **Faz 3** | Test (birim/eval/E2E/QA) + KVKK/yasal metinler + polish | Yayına hazır |
| **Faz 4** | Deploy (VPS + Docker + Caddy) + canlı izleme | Canlıda |

Her faz kendi içinde tamamlanır ve test edilir; bir sonrakine geçmeden çalışır halde olur.

---

## 5. Veri Modeli (Postgres + Prisma)

```
User      → id, email, ad, oluşturma, (auth bilgisi)
Case      → id, userId, başlık, kategori, durum, oluşturma   (kullanıcının "derdi" = bir vaka)
Message   → id, caseId, rol (user/assistant), içerik, zaman   (chat modu konuşma geçmişi)
Document  → id, caseId, tip, içerik(metin), durum(taslak/ödendi), merci, oluşturma
Payment   → id, userId, documentId, tutar, durum, iyzicoRef, zaman
```

**Mantık:** Her "dert" bir `Case`. Bir Case altında `Message`'lar (chat) ve `Document`(lar) olur. Ödeme belgeye bağlanır.

---

## 6. Kullanıcı Akışı

```
1. Giriş → mod seç:  [Serbest Anlat 💬]  veya  [Adım Adım Form 📋]

2a. CHAT MODU:
    Kullanıcı derdini yazar
    → AI anlar, kategoriyi belirler
    → Eksik bilgileri tek tek sorar (tarih, taraf, tutar...)
    → "Belgen hazır" der

2b. FORM MODU:
    Kullanıcı kategori seçer / kısa açıklama yazar
    → AI uygun belge tipini + akıllı formu getirir (önceden doldurulmuş)
    → Kullanıcı eksikleri tamamlar

3. ÜRETİM:
    → Claude belgeyi üretir + öz-kontrol geçişi
    → BULANIK ÖNİZLEME (ilk paragraf net, gerisi blur)
    → "Tam belgeyi indir — 99 TL" butonu

4. ÖDEME (Faz 2):
    → iyzico ödeme → başarılı → belge açılır
    → PDF/Word indir + "nereye nasıl göndereceğin" rehberi

5. HESAP:
    → Geçmiş vakalar, ödenen belgeler, tekrar indirme
```

---

## 7. AI Motoru (Yaklaşım A — Saf LLM, 4 Adım)

**Adım 1 — Sınıflandırma (Classifier):** İlk anlatımı alır, JSON döner:
```json
{ "kategori": "tüketici",
  "belgeTipi": "tüketici hakem heyeti başvurusu",
  "merci": "İlçe Tüketici Hakem Heyeti",
  "eksikBilgiler": ["satın alma tarihi", "ürün bedeli", "satıcı ünvanı"] }
```

**Adım 2 — Bilgi Toplama (Slot-filling):**
- Chat modu: `eksikBilgiler`'i tek tek doğal dille sorar
- Form modu: aynı listeyi form alanlarına çevirir

**Adım 3 — Belge Üretimi (Generator):** Toplanan veri + güçlü sistem promptu → belge. Sistem promptu kuralları:
- Resmi Türkçe dilekçe formatı (başlık, taraflar, konu, açıklamalar, talep, tarih-imza)
- "Emin olmadığın kanun maddesi numarası yazma; genel ifade kullan"
- Kullanıcının seçtiği ton (resmi/sert/uzlaşmacı)

**Adım 4 — Öz-Kontrol (Self-check):** Üretilen belgeyi tekrar kontrol ettir (eksik alan, tutarsızlık, `[DOLDURUN]` kalmış yer, halüsinasyon madde) ve düzelt.

**Model dağılımı:**
- Sınıflandırma + öz-kontrol → **Haiku 4.5** (hızlı/ucuz)
- Belge üretimi → **Opus 4.8** (en kaliteli Türkçe hukuki dil)

**Genişletilebilirlik:** Tüm promptlar versiyonlu `prompts/` klasöründe. İleride şablon (Yaklaşım B) eklemek = sadece prompt katmanı; kod değişmez.

---

## 8. Ödeme & Freemium

**iyzico akışı (Faz 2):**
```
Önizleme → "İndir 99 TL"
   → iyzico Checkout Form (kart bilgisi iyzico'da, bizde değil)
   → Kullanıcı öder → iyzico webhook → /api/payment/callback
   → Payment.durum = "başarılı" → Document.durum = "ödendi" → indirme açılır
```

**Neden iyzico:** Yerel kart + taksit + BKM, PCI-DSS uyumu onlarda (kart verisi bize gelmez), Next.js SDK. PayTR'ye geçiş için SDK soyutlaması.

**Freemium kilidi (kritik):** Tam belge metni sunucu tarafında `Document.durum == "ödendi"` olmadan **asla API'den dönmez**. Önizleme ayrı üretilir (ilk N karakter / blur). Frontend'de blur kaldırmak işe yaramaz — tam metin sunucuda kilitli.

---

## 9. Güvenlik & KVKK (Faz 3)

- **KVKK:** Aydınlatma metni + açık rıza onayı (hassas veri paylaşımı söz konusu). Veri saklama süresi politikası.
- **Sorumluluk reddi:** Her belgede + üretim öncesi onay kutusu: *"Bu bir taslaktır, hukuki tavsiye değildir, sorumluluk kullanıcıdadır."*
- **Veri güvenliği:** HTTPS, oturum güvenliği (httpOnly cookie), hassas alan koruması.
- **Rate limiting:** AI maliyeti ve kötüye kullanım kontrolü (örn. kayıtsız kullanıcıya günde X üretim).
- **Prompt injection koruması:** Kullanıcı metni sistem promptunu ezemesin diye ayrıştırma.
- **Maliyet kontrolü:** Her vakanın AI token maliyeti loglanır (kârlılık takibi).

---

## 10. Test Stratejisi (Faz 3)

| Katman | Ne test edilir | Araç |
|--------|----------------|------|
| Birim | Sınıflandırıcı JSON, paywall kilidi, fiyat hesabı | Vitest |
| AI çıktı kalitesi | 10-15 senaryo → "altın set" ile karşılaştırma | Özel eval script |
| Entegrasyon | API rotaları: chat→generate→payment | Vitest + test DB |
| E2E | Derdini anlat → önizleme → öde → indir | Playwright |
| Manuel QA | iyzico sandbox ödeme, mobil görünüm | /qa |

AI kalite eval'i her değişiklikte çalışır: doğru merci, doğru format, `[DOLDURUN]` yok, halüsinasyon madde yok.

---

## 11. Docker Stratejisi (Yerel + Canlı)

**İki compose dosyası:**
```
docker-compose.yml          → PRODUCTION (VPS): Next.js (optimize) + Postgres + Caddy
docker-compose.dev.yml      → YEREL: Next.js (hot-reload, bind mount) + Postgres (Caddy yok)
```

**Yerel geliştirme:**
```
docker compose -f docker-compose.dev.yml up
   → Next.js hot-reload localhost:3000
   → Postgres localhost:5432 (kalıcı volume)
```

**Testler:**
```
docker compose -f docker-compose.dev.yml run app npm test
docker compose -f docker-compose.dev.yml run app npm run eval
```

Aynı multi-stage `Dockerfile` (dev/prod hedefleri), aynı Postgres imajı her yerde. Prisma migration'ları container içinde çalışır. **Dev/prod parity.**

---

## 12. Deploy (Faz 4 — Kendi VPS)

```
┌──────────────── VPS (Ubuntu) ────────────────┐
│  Caddy / Nginx (reverse proxy + otomatik SSL) │
│        ├──► Next.js (Docker container)         │
│        └──► Postgres (Docker container + volume)│
│  docker-compose.yml ile tek komutla            │
└────────────────────────────────────────────────┘
```

- **Caddy:** Tek satır config ile otomatik HTTPS (Let's Encrypt).
- **Postgres:** VPS içinde Docker volume; `pg_dump` cron yedek.
- **Deploy yöntemi:** Başlangıçta `git pull` → `docker compose build` → `up -d`. İleride GitHub Actions + SSH otomasyonu (opsiyonel).
- **SSH:** Kullanıcı zamanı gelince sağlayacak. Kod ve deploy dosyaları (Dockerfile, docker-compose.yml, .env.example, Caddyfile, DEPLOY.md) baştan VPS'e göre hazırlanır.
- **Ortam değişkenleri:** Claude API key, iyzico key, DB URL → sadece sunucudaki `.env`, repoda asla.
- **Soft launch:** İlk gün küçük kitle → dönüşüm/belge kalitesi izle → ölçekle.

---

## 13. Özellik Yol Haritası

**Çekirdek (Faz 1-2):** İki giriş modu, niyet anlama + merci seçimi, eksik bilgi toplama, belge üretimi + bulanık önizleme, ödeme → PDF/Word indirme, hesap + belge geçmişi, KVKK + sorumluluk reddi.

**Farklılaştırıcı (Faz 2+):** "Nereye nasıl göndereceğin" rehberi, belge ton seçimi, bir olaydan çoklu belge türetme, hukuki güç göstergesi (ileride RAG ile), şablon/örnek kütüphanesi.

**Büyüme (Faz 3+):** Avukata yönlendirme/marketplace (gelecekteki hibrit), süreç takibi/hatırlatma, WhatsApp/mobil, admin paneli + analytics.

---

## 14. Açık/Ertelenmiş Konular

- Hukuki ruhsat/altyapı — ileride çözülecek (MVP self-servis modelle riski minimize eder).
- Kesin fiyatlandırma (99 TL örnek) — pazar testiyle netleşecek.
- VPS SSH erişimi — kullanıcı sağlayınca Faz 4 uygulanır.
- Yaklaşım B (şablon) geçişi — gerekirse Faz 2+ prompt katmanında.
