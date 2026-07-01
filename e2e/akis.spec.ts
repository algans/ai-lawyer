import { test, expect } from "@playwright/test";

// Duman testleri: AI veya ödeme gerektirmeyen sayfalar.
// Bu testlerin geçmesi için yalnızca çalışan bir dev server yeterlidir.

test("landing sayfası her iki mod bağlantısını gösterir", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AI Hukuki Belge Asistanı" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Serbest Anlat/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Adım Adım Form/i })).toBeVisible();
});

test("/giris sayfası e-posta ve parola alanlarını içerir", async ({ page }) => {
  await page.goto("/giris");
  await expect(page.getByRole("heading", { name: "Giriş Yap" })).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#parola")).toBeVisible();
});

test("/kvkk sayfası aydınlatma metnini gösterir", async ({ page }) => {
  await page.goto("/kvkk");
  await expect(page.getByRole("heading", { name: "KVKK Aydınlatma Metni" })).toBeVisible();
  // pre etiketinin içerik barındırdığını doğrula
  const pre = page.locator("pre");
  await expect(pre).toBeVisible();
  const text = await pre.textContent();
  expect(text && text.length > 50).toBeTruthy();
});

// ---------------------------------------------------------------------------
// TAM AKIŞ: chat → ödeme → belge indirme
// Gerçek ANTHROPIC_API_KEY + iyzico sandbox anahtarları + çalışan dev server gerektirir.
// CI/yerel ortamda `npm run e2e` ile çalıştırın.
// ---------------------------------------------------------------------------
test.skip("tam akış: serbest anlatı → ödeme → belge indir", async ({ page }) => {
  // 1. Landing'den chat moduna gir
  await page.goto("/");
  await page.getByRole("button", { name: /Serbest Anlat/i }).click();

  // 2. Hukuki durumu anlat ve belge türü seç
  await page.waitForURL("**/chat**");
  await page.getByRole("textbox").fill("İş yerinden haksız çıkarıldım, iş mahkemesine başvurmak istiyorum.");
  await page.getByRole("button", { name: /Gönder/i }).click();

  // 3. AI yanıtını bekle ve belge türünü onayla
  await page.waitForSelector("[data-testid='ai-response']", { timeout: 30_000 });
  await page.getByRole("button", { name: /Devam/i }).click();

  // 4. Ödeme adımı — iyzico sandbox test kartıyla
  await page.waitForURL("**/odeme**");
  await page.getByLabel(/Kart Numarası/i).fill("5528790000000008");
  await page.getByLabel(/Son Kullanma/i).fill("12/30");
  await page.getByLabel(/CVV/i).fill("123");
  await page.getByRole("button", { name: /Ödeme Yap/i }).click();

  // 5. Ödeme başarılı → belge indirme sayfası
  await page.waitForURL("**/belge**", { timeout: 20_000 });
  const indirBtn = page.getByRole("link", { name: /İndir/i });
  await expect(indirBtn).toBeVisible();
});
