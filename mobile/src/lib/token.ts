import * as SecureStore from "expo-secure-store";

const ANAHTAR = "oturum_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ANAHTAR);
}
export async function setToken(t: string): Promise<void> {
  await SecureStore.setItemAsync(ANAHTAR, t);
}
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ANAHTAR);
}
