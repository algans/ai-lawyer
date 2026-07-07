# AI Hukuki Asistan — Kapsamlı Tasarım Prompt'u

> Bu dosya, tüm ekranları yeniden tasarlamak için bir yapay zekâ tasarım aracına (Claude, v0, Figma AI vb.) verilebilecek **kendi kendine yeten** bir prompt'tur. Aşağıdaki bloğun tamamını kopyalayıp araca yapıştır.

---

## 🎨 PROMPT (kopyala–yapıştır)

Sen kıdemli bir ürün tasarımcısısın. Türkiye'de faaliyet gösteren bir **yapay zekâ destekli hukuki belge asistanı** web uygulamasının **tüm ekranlarını** sıfırdan, yüksek kaliteli ve tutarlı bir tasarım sistemiyle yeniden tasarlayacaksın. Uygulamanın dili **Türkçe**; tüm arayüz metinlerini aşağıda verildiği gibi **birebir** kullan.

### Ürün bağlamı
Sıradan insanlar derdini serbestçe anlatır; sistem yapay zekâ ile doğru belge tipini (tüketici şikayeti, savcılığa suç duyurusu, kamu/idareye dilekçe, kira/komşu/iş uyuşmazlığı) ve doğru mercii belirleyip resmi bir **hukuki belge taslağı** üretir. Kullanıcı önizlemeyi görür, öder ve PDF/Word olarak indirir. Model: freemium (önizleme ücretsiz, tam belge 99 TL). Bu bir **taslak** hizmetidir, hukuki tavsiye değildir; sorumluluk kullanıcıdadır.

### Marka kişiliği ve his
Güven veren, kurumsal, otoriter ama erişilebilir. Modern bir hukuk bürosu ile temiz bir fintech arası. **Ciddi ve profesyonel** — oyuncul, neon, "startup şablonu" veya jenerik yapay zekâ estetiği DEĞİL. Sakin, net, ferah, tipografi öncelikli.

### Renk paleti — koyu yeşil + beyaz (zorunlu)
Beyaz tuval üzerinde koyu yeşil marka. Aşağıdaki token'ları birebir kullan:

```
/* Yeşiller */
--green-950: #06231A   /* en koyu — footer zemini */
--green-900: #0A2C21   /* koyu marka — hero/nav zemini */
--green-800: #0E3B2E   /* birincil marka yeşili */
--green-700: #14513D
--green-600: #1B6B4C   /* birincil buton */
--green-500: #22855E   /* hover / vurgu */
--green-100: #E7F1EC   /* açık yüzey / tint */
--green-50:  #F2F8F5

/* İsteğe bağlı altın vurgu — "resmi belge / mühür" hissi için ölçülü kullan */
--gold-500:  #C6A15B
--gold-100:  #F4ECDB

/* Nötrler */
--ink:      #0F1E17    /* başlık ve gövde metni (açık zeminde) */
--muted:    #5A6B63    /* ikincil metin */
--border:   #DCE7E1
--surface:  #FFFFFF    /* kart / panel */
--canvas:   #F6F9F7    /* sayfa arka planı (kırık beyaz) */

/* Anlamsal */
--success:  #12855A    /* "Ödendi" */
--warning:  #B07A12    /* "Taslak" (amber) */
--danger:   #B42318    /* hata */
```

Kural: Ana eylemler ve marka öğeleri koyu yeşil; tuval beyaz/kırık beyaz. Altın yalnızca ince ayraç, mühür/rozet ve "premium/resmi" dokunuşlarda — asla baskın değil. Kontrast WCAG AA (yeşil zemin üzerinde beyaz metin, beyaz zeminde `--ink`).

### Tipografi (avukatlık hizmetine uygun — seçildi)
Google Fonts, **latin-ext (Türkçe) alt kümesi zorunlu** (ş, ğ, ı, İ, ç, ö, ü):
- **Başlıklar ve marka: `Lora`** (serif) — güven, gelenek, okunabilirlik. Ağırlık 500–600.
- **Arayüz ve gövde: `Inter`** (sans-serif) — nötr, profesyonel, mükemmel Türkçe desteği. Ağırlık 400–600.
- **Üretilen belge önizleme metni:** serif (`Lora`, ~15–16px, satır yüksekliği 1.7) — gerçek bir dilekçe/resmi belge gibi görünsün.
- (Daha karakterli bir alternatif istenirse başlıklarda `Fraunces` kullanılabilir.)

Tip ölçeği (masaüstü): H1 40–48/1.15, H2 28–32/1.2, H3 22, gövde 16/1.6, küçük 14/1.5, buton 16/600. Mobilde H1 30–34.

### Düzen, boşluk, biçim
- Izgara/boşluk 8'lik sistem: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Kapsayıcı genişlikleri: form/sohbet **640px**, içerik **800px**, pazarlama bölümleri **1080px**. Bölüm dikey boşluğu masaüstü 64–96, mobil 40.
- Köşe yarıçapı: buton/input 10px, kart 14–16px, rozet/pill 999px.
- Gölge (ince): kart `0 1px 2px rgba(15,30,23,.06), 0 8px 24px rgba(15,30,23,.06)`; hover'da hafif yükselme.
- Odak halkası: 2px `--green-500`, 2px offset. Kenarlık 1px `--border`.
- İkonlar: çizgi ikon (Lucide/Feather), 1.5–2px; hukuk temalı (terazi, kalkan/gizlilik, belge, tokmak) **ölçülü**.
- Hareket: 150–220ms ease-out; hover'da 1–2px yükselme ve renk geçişi. Abartısız (bounce yok). Paywall'da yumuşak blur/açılma.
- **Mobil öncelikli**, her ekran responsive; yatay taşma olmamalı.

### Bileşen kütüphanesi (tümünü tasarla)
Buton (birincil yeşil / ikincil çerçeveli / bağlantı / devre dışı / yükleniyor "Lütfen bekleyin..."); metin girişi + textarea (etiket üstte, odak yeşil halka, hata kırmızı kenarlık); onay kutusu (özel, yeşil tik); kart (dava/belge); durum pill'i ("Ödendi" yeşil, "Taslak" amber); uyarı/bilgi şeridi (başarı yeşil tint, hata kırmızı tint); sohbet balonları (kullanıcı sağ yeşil-tint, asistan sol beyaz/sage) + yazıyor göstergesi + alt sabit giriş çubuğu; dinamik form alanları; **belge önizleme paneli** (beyaz "kâğıt", ince gölge, serif metin) ve alt kısmında **paywall kilit katmanı** (okunur → bulanık geçiş, kilit ikonu, "Tam Belgeyi İndir — 99 TL", "Güvenli ödeme • iyzico" güven ipucu); boş durum; iskelet/yükleme; sticky üst menü ve koyu yeşil footer.

### Global çerçeve (her ekranda)
- **Üst menü (sticky):** Beyaz zemin, altında 1px `--border`. Solda marka (terazi/tokmak ikon + `Hukuki Asistan` — Lora). Sağda bağlantılar: `Giriş`, `Hesabım` ve birincil CTA `Belge Hazırla`. Mobilde hamburger.
- **Footer (koyu yeşil `--green-950`):** kısa açıklama, `KVKK` linki, sorumluluk reddi cümlesi ("Bu bir taslaktır, hukuki tavsiye değildir. Sorumluluk kullanıcıdadır."), telif.

---

### EKRANLAR (hepsini tasarla — masaüstü + mobil)

**1) Ana Sayfa `/`**
- Hero: başlık **"AI Hukuki Belge Asistanı"**, alt metin **"Derdinizi anlatın, size uygun hukuki belgeyi hazırlayalım."**, birincil CTA. Koyu yeşil zeminli veya beyaz zeminde büyük yeşil tipografi; sağda ince bir terazi/belge illüstrasyonu (opsiyonel, sade).
- İki **mod kartı** (yan yana, büyük, tıklanabilir): **"💬 Serbest Anlat"** (`/chat` — sohbetle anlat) ve **"📋 Adım Adım Form"** (`/form` — kısa formla ilerle). Emojiler yerine ince ikonlar kullanılabilir.
- "Nasıl çalışır?" 3 adım: **Anlat → Yapay zekâ hazırlar → İndir**.
- Kategoriler şeridi: **Tüketici/Alışveriş, Suç İhbarı/Savcılık, Kamu/İdare Şikayeti, Kira/Komşu/İş**.
- Sorumluluk reddi vurgusu: *"Bu bir taslaktır, hukuki tavsiye değildir. Sorumluluk kullanıcıdadır."*

**2) Serbest Anlat (Sohbet) `/chat`** — sayfa başlığı **"Derdinizi Anlatın"**
- Sohbet akışı: kullanıcı ("Siz") ve asistan ("Asistan") balonları. Alt sabit giriş: placeholder **"Derdinizi anlatın..."**, buton **"Gönder"** (Enter ile de gönderilir).
- Bilgi tamamlanınca: onay kutusu — **"[KVKK aydınlatma metni](/kvkk) ve sorumluluk reddini okudum, kabul ediyorum."** (işaretlenmeden buton pasif) + buton **"Belgeyi Oluştur"**.
- Üretimden sonra: **"Önizleme"** başlığı + belge önizleme paneli + paywall kilidi + buton **"Tam Belgeyi İndir — 99 TL"**.

**3) Adım Adım Form `/form`** — sayfa başlığı **"Adım Adım Form"**
- Adım 1: textarea placeholder **"Kısaca sorununuz..."** + buton **"Devam"**.
- Adım 2: yapay zekânın döndürdüğü **dinamik alanlar** (etiketli inputlar, dikey liste) + aynı onay kutusu + buton **"Belgeyi Oluştur"**.
- Sonra: belge önizleme paneli + paywall + buton **"Tam Belgeyi İndir — 99 TL"**.

**4) Belge Önizleme + Paywall (kritik alt-ekran — özel özen)**
- Beyaz bir "belge sayfası": resmi dilekçe formatı (üstte makam/merci, taraf bilgileri, KONU, AÇIKLAMALAR, TALEP, tarih-imza), serif metin.
- İlk paragraf net; gerisi **bulanık/kilitli**. Üstte bir kilit rozeti, **"Tam Belgeyi İndir — 99 TL"** birincil CTA, "Güvenli ödeme • iyzico" güven ipucu, "PDF ve Word olarak indir" notu. Bu, dönüşümün yaşandığı an — ferah, güven verici, net tasarla.

**5) Giriş `/giris`** — başlık **"Giriş Yap"**
- Alanlar: **E-posta** (placeholder `ornek@eposta.com`), **Parola** (placeholder "Parolanız"). Hata mesajı satırı. Buton **"Giriş Yap"** (yükleniyorken "Lütfen bekleyin..."). Altta bağlantı: **"Hesabınız yok mu? Kayıt olun"** → `/kayit`. Ortalanmış, dar (~400px) kart.

**6) Kayıt `/kayit`** — başlık **"Kayıt Ol"**
- Alanlar: **Ad (isteğe bağlı)** (placeholder "Adınız"), **E-posta**, **Parola** (placeholder "En az 6 karakter"). Buton **"Kayıt Ol"**. Altta bağlantı: **"Zaten hesabınız var mı? Giriş yapın"** → `/giris`.

**7) Hesabım — Belge Geçmişi `/hesap`** — başlık **"Hesabım — Belge Geçmişi"**
- Üstte ödeme sonucu şeridi: başarı (yeşil tint) **"Ödemeniz başarıyla alındı. Belgenizi artık indirebilirsiniz."** / hata (kırmızı tint) **"Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin."**
- Yükleniyor durumu: **"Yükleniyor..."**. Boş durum: **"Henüz hiç belgeniz bulunmuyor."**
- Dava kartları: başlık, alt satır **"Kategori: … • {tarih}"**. Her davada belge kartları: belge tipi + durum pill'i (**"Ödendi"** yeşil / **"Taslak"** amber) + tarih.
  - Ödendi ise: **"PDF İndir"** ve **"Word İndir"** butonları.
  - Taslak ise: **"Öde ve İndir (99 TL)"** butonu (tıklayınca "Yönlendiriliyor...").

**8) KVKK Aydınlatma `/kvkk`** — başlık **"KVKK Aydınlatma Metni"**
- Uzun hukuki metin için okunaklı, tek sütun, ferah tipografik düzen (maks 800px, satır yüksekliği 1.7). Başlık ve maddeler net hiyerarşiyle.

### Durumlar ve responsive
Her ekran için: boş, yükleniyor (iskelet), hata (ör. "Çok fazla istek. Lütfen daha sonra tekrar deneyin." 429 uyarısı) ve mobil düzenini de tasarla. Butonlar/inputlar mobilde tam genişlik, dokunma-dostu (min 44px yükseklik).

### Çıktı ve kısıtlar
- Yukarıdaki token'ları, fontları ve **birebir Türkçe metinleri** kullan.
- Tutarlı bir tasarım sistemiyle **tüm ekranların** yüksek sadâkatli tasarımını üret (masaüstü + mobil). Önce paylaşılan bileşen/token seti, sonra ekran ekran.
- Jenerik yapay zekâ şablonundan kaçın; profesyonel, kurumsal, hukuki güven hissi ver.
- (Kod isteniyorsa: React + Tailwind, erişilebilir/semantik, responsive.)

---

## 🎯 Bu prompttaki tasarım kararları (özet)
- **Renk:** koyu yeşil ölçeği (#0E3B2E ana marka) + kırık beyaz tuval + ölçülü altın vurgu; anlamsal renkler (Ödendi/Taslak/hata).
- **Font:** başlık/marka **Lora** (serif, güven), arayüz **Inter** (sans, Türkçe-güçlü), belge metni serif; alternatif başlık **Fraunces**.
- **His:** hukuk bürosu × fintech; sakin, otoriter, ferah, tipografi öncelikli.
- **Kapsanan ekranlar:** Global nav+footer, `/`, `/chat`, `/form`, belge önizleme+paywall, `/giris`, `/kayit`, `/hesap`, `/kvkk` + boş/yükleme/hata/mobil durumlar.
