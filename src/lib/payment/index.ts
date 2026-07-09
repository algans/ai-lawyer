import { iyzicoProvider } from "./iyzico";
import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./provider";

export type Saglayici = "iyzico" | "stripe";

// Ödeme sağlayıcısı seçicisi (registry). init rotası `saglayici` anahtarını buradan
// çözer; iyzico'nun kod yolu değişmez. Yalnızca `checkoutBaslat` ortak arayüzdür —
// doğrulama sağlayıcıya özgüdür (iyzico: callback retrieve, stripe: webhook).
const REGISTRY: Record<Saglayici, Pick<PaymentProvider, "checkoutBaslat">> = {
  iyzico: iyzicoProvider,
  stripe: stripeProvider,
};

export function getSaglayici(s: Saglayici): Pick<PaymentProvider, "checkoutBaslat"> {
  return REGISTRY[s];
}
