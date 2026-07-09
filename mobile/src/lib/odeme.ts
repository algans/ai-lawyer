import * as WebBrowser from "expo-web-browser";
// SDK 54 (expo-file-system v19): klasik downloadAsync ana modülden re-export edilir (uyarıyla);
// hedef yolu yeni API'deki Paths.cache'ten alınır. {uri,status} hata yönetimi için gerekli.
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { apiFetch } from "./api";
import { API_URL } from "./config";
import type { PaymentInitYanit } from "./types";

// Sağlayıcı checkout'unu in-app tarayıcıda açar; kullanıcı ödeyip döner.
export async function odemeBaslat(documentId: string, token: string): Promise<void> {
  const d = await apiFetch<PaymentInitYanit>("/api/payment/init", {
    method: "POST",
    token,
    body: { documentId, saglayici: "iyzico" },
  });
  await WebBrowser.openBrowserAsync(d.paymentPageUrl);
}

export async function belgeDurumu(documentId: string, token: string): Promise<"taslak" | "odendi"> {
  try {
    await apiFetch(`/api/document/${documentId}`, { token });
    return "odendi"; // 200 → içerik döndü → ödenmiş
  } catch (e) {
    if ((e as { status?: number })?.status === 402) return "taslak"; // ödeme gerekli
    throw e;
  }
}

// Ödenmiş belgeyi Bearer ile indirip paylaş/aç.
export async function belgeIndir(documentId: string, format: "pdf" | "docx", token: string): Promise<void> {
  const hedef = new FileSystem.File(FileSystem.Paths.cache, `belge-${documentId}.${format}`);
  const { uri, status } = await FileSystem.downloadAsync(
    `${API_URL}/api/document/${documentId}/download?format=${format}`,
    hedef.uri,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (status !== 200) throw { status, message: "Belge indirilemedi." };
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
}
