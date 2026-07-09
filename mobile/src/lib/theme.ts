// Web'deki src/app/globals.css tokenlarının birebir portu.
export const renk = {
  bg: "#F6F9F7",
  ink: "#0F1E17",
  muted: "#5A6B63",
  faint: "#8A9790",
  border: "#DCE7E1",
  borderSoft: "#EDF3F0",
  green900: "#0A2C21",
  green800: "#0E3B2E",
  green700: "#14513D",
  green600: "#1B6B4C",
  green500: "#22855E",
  mint: "#E7F1EC",
  mintSoft: "#EEF4F0",
  mintBg: "#F2F8F5",
  gold: "#C6A15B",
  goldLight: "#E7CE97",
  success: "#12855A",
  successBg: "#EAF6EF",
  error: "#B42318",
  errorInk: "#8A231B",
  errorBg: "#FCEDEC",
  draftBg: "#FBF3E1",
  draftInk: "#B07A12",
  white: "#FFFFFF",
} as const;

export const bosluk = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const fontAilesi = {
  govde: "Inter_400Regular",
  govdeOrta: "Inter_500Medium",
  govdeKalin: "Inter_600SemiBold",
  baslik: "Lora_600SemiBold",
} as const;
