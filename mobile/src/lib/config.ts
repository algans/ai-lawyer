// API tabanı. Expo, EXPO_PUBLIC_* değişkenlerini build sırasında inline eder.
// Farklı backend için: EXPO_PUBLIC_API_URL=https://... npx expo start
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? "https://ai-hukuki-asistan.fly.dev";
