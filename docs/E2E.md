# E2E Testleri (Playwright)

## Genel Bakış

`e2e/akis.spec.ts` dosyası iki kategoride test içerir:

1. **Duman testleri** — AI veya ödeme gerektirmeyen sayfalar (`/`, `/giris`, `/kvkk`). Yalnızca çalışan dev server yeterlidir.
2. **Tam akış testi** (`test.skip`) — chat → ödeme → belge indirme. `ANTHROPIC_API_KEY`, iyzico sandbox anahtarları ve çalışan dev server gerektirir.

---

## Yerel Ortamda Çalıştırma

### 1. `.env` dosyasına gerçek anahtarları ekleyin

```
ANTHROPIC_API_KEY=sk-ant-...
IYZICO_API_KEY=sandbox_...
IYZICO_SECRET_KEY=sandbox_...
```

### 2. Dev server'ı başlatın

```bash
docker compose -f docker-compose.dev.yml up
```

### 3. Duman testlerini çalıştırın

```bash
docker compose -f docker-compose.dev.yml run --rm app npm run e2e
```

veya belirli bir APP_URL ile:

```bash
APP_URL=http://localhost:3000 npx playwright test
```

### 4. Tam akış testini aktif etmek

`e2e/akis.spec.ts` dosyasındaki `test.skip(...)` satırını `test(...)` olarak değiştirin. iyzico sandbox test kartı: `5528790000000008`, son kullanma `12/30`, CVV `123`.

---

## CI Ortamı

CI pipeline'da aşağıdaki ortam değişkenleri ayarlanmalıdır:

- `APP_URL` — çalışan Next.js sunucusunun adresi
- `ANTHROPIC_API_KEY`
- `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` (sandbox)

Playwright tarayıcıları CI imajında yüklü olmalıdır:

```bash
npx playwright install --with-deps chromium
```

---

## Vitest (Unit) Testleriyle Çakışma Yok

- `npm test` → `vitest run` — yalnızca `src/` altındaki testleri çalıştırır.
- `npm run e2e` → `playwright test` — yalnızca `e2e/` altındaki testleri çalıştırır.
- İki runner birbirinden izole edilmiştir; `testDir` ayrıdır.
