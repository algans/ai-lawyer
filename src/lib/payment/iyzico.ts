import Iyzipay from "iyzipay";
import type { CheckoutInput, PaymentProvider } from "./provider";

const client = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  uri: process.env.IYZICO_BASE_URL!,
});

function initialize(req: object): Promise<any> {
  return new Promise((resolve, reject) => {
    (client as any).checkoutFormInitialize.create(req, (err: unknown, result: any) => {
      if (err) return reject(err);
      if (result?.status !== "success") return reject(new Error(result?.errorMessage ?? "iyzico başlatma hatası"));
      resolve(result);
    });
  });
}
function retrieve(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    (client as any).checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token }, (err: unknown, result: any) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export const iyzicoProvider: PaymentProvider = {
  async checkoutBaslat(i: CheckoutInput) {
    const result = await initialize({
      locale: Iyzipay.LOCALE.TR,
      conversationId: i.conversationId,
      price: i.tutar.toString(),
      paidPrice: i.tutar.toString(),
      currency: Iyzipay.CURRENCY.TRY,
      basketId: i.documentId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: i.callbackUrl,
      buyer: {
        id: i.buyerId, name: "Musteri", surname: "Kullanici", email: i.buyerEmail,
        identityNumber: "11111111111", registrationAddress: "Turkiye", city: "Istanbul", country: "Turkey",
        ip: "85.34.78.112",
      },
      basketItems: [{
        id: i.documentId, name: "Hukuki belge", category1: "Hizmet",
        itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL, price: i.tutar.toString(),
      }],
    });
    return { paymentPageUrl: result.paymentPageUrl, token: result.token };
  },
  async callbackDogrula(token: string) {
    const result = await retrieve(token);
    return { basarili: result?.paymentStatus === "SUCCESS", iyzicoRef: result?.paymentId ?? "" };
  },
};
