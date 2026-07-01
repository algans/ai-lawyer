export interface CheckoutInput {
  documentId: string;
  tutar: number;
  conversationId: string;
  callbackUrl: string;
  buyerEmail: string;
  buyerId: string;
}
export interface PaymentProvider {
  checkoutBaslat(i: CheckoutInput): Promise<{ paymentPageUrl: string; token: string }>;
  callbackDogrula(token: string): Promise<{ basarili: boolean; iyzicoRef: string; paidPrice: number; currency: string }>;
}
