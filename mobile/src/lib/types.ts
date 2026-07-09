export type Msg = { rol: "user" | "assistant"; icerik: string };

export type ChatYanit = { caseId: string; cevap: string; tamamlandi: boolean };
export type GenerateYanit = { documentId: string; onizleme: string };
export type PaymentInitYanit = { paymentPageUrl: string };
export type AuthYanit = { userId: string; token: string };

export type BelgeOzet = { id: string; tip: string; durum: "taslak" | "odendi"; createdAt: string };
export type Case = {
  id: string;
  baslik: string;
  kategori: string;
  createdAt: string;
  documents: BelgeOzet[];
};
export type CasesYanit = { cases: Case[] };
