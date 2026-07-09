import Stripe from "stripe";
import type { CheckoutInput } from "./provider";
import { PARA_BIRIMI } from "@/lib/pricing";

// iyzico callback'inden bağımsız, kendi doğrulama sonucu tipi (spec: "ayrı kopya").
export type StripeDogrulama = {
  basarili: boolean;
  ref: string;
  paidPrice: number;
  currency: string;
};

// Lazy istemci — modül üst seviyesinde `new Stripe(...)` YAZMA; `next build`
// sırasında anahtar istemesin diye ilk kullanımda başlatılır (iyzico getClient deseni).
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

export const stripeProvider = {
  async checkoutBaslat(i: CheckoutInput): Promise<{ paymentPageUrl: string; token: string }> {
    const base = process.env.APP_URL ?? "";
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            // Stripe tutarı en küçük birimde ister (kuruş): 99 TRY → 9900.
            currency: PARA_BIRIMI.toLowerCase(),
            product_data: { name: "Hukuki belge" },
            unit_amount: i.tutar * 100,
          },
          quantity: 1,
        },
      ],
      // Belge kilidini webhook açar; bu URL'ler yalnızca kullanıcıyı geri getirir (UX).
      success_url: `${base}/hesap?odeme=basarili`,
      cancel_url: `${base}/hesap?odeme=basarisiz`,
      client_reference_id: i.documentId,
      customer_email: i.buyerEmail,
      metadata: { documentId: i.documentId },
    });
    return { paymentPageUrl: session.url!, token: session.id };
  },

  // Webhook imzasını HAM gövdeyle doğrular, sonucu iyzico'nunkiyle aynı biçime normalize eder.
  webhookDogrula(rawBody: string, signature: string): StripeDogrulama {
    const event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
    if (event.type !== "checkout.session.completed") {
      return { basarili: false, ref: "", paidPrice: 0, currency: "" };
    }
    const session = event.data.object as Stripe.Checkout.Session;
    return {
      basarili: session.payment_status === "paid",
      ref: session.id,
      paidPrice: (session.amount_total ?? 0) / 100, // kuruş → TL
      currency: (session.currency ?? "").toUpperCase(), // "try" → "TRY"
    };
  },
};
