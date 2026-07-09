import { useRef, useState } from "react";
import {
  View,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { renk, radius, fontAilesi } from "../../lib/theme";
import { apiFetch } from "../../lib/api";
import type { ChatYanit, GenerateYanit, Msg } from "../../lib/types";
import GreenHeader from "../../components/GreenHeader";
import ChatBubble from "../../components/ChatBubble";
import TypingDots from "../../components/TypingDots";
import Banner from "../../components/Banner";
import RizaOnay from "../../components/RizaOnay";
import { setOnizleme } from "../../lib/preview-cache";

const KARSILAMA =
  "Merhaba! Ben hukuki belge asistanınızım. Yaşadığınız sorunu kısaca anlatır mısınız?";

export default function Sohbet() {
  const router = useRouter();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [tamam, setTamam] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [olusturuluyor, setOlusturuluyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function gonder() {
    const mesaj = input.trim();
    if (!mesaj || gonderiliyor) return;
    setHata(null);
    setMsgs((m) => [...m, { rol: "user", icerik: mesaj }]);
    setInput("");
    setGonderiliyor(true);
    try {
      const d = await apiFetch<ChatYanit>("/api/chat", {
        method: "POST",
        body: caseId ? { caseId, mesaj } : { mesaj },
      });
      setCaseId(d.caseId);
      setMsgs((m) => [...m, { rol: "assistant", icerik: d.cevap }]);
      setTamam(d.tamamlandi);
    } catch (e) {
      setHata((e as { message?: string })?.message ?? "Bir hata oluştu.");
    } finally {
      setGonderiliyor(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  async function olustur() {
    if (!caseId || olusturuluyor) return;
    setHata(null);
    setOlusturuluyor(true);
    try {
      const d = await apiFetch<GenerateYanit>("/api/generate", {
        method: "POST",
        body: { caseId, rizaOnay: true },
      });
      setOnizleme(d.documentId, d.onizleme);
      router.push(`/onizleme/${d.documentId}`);
    } catch (e) {
      setHata((e as { message?: string })?.message ?? "Belge oluşturulamadı.");
    } finally {
      setOlusturuluyor(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: renk.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <GreenHeader baslik="Derdinizi Anlatın" altMetin="Gerekli bilgileri size adım adım soralım." />
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {hata && <Banner tur="error" mesaj={hata} />}
        {msgs.length === 0 && <ChatBubble rol="assistant" icerik={KARSILAMA} />}
        {msgs.map((m, i) => (
          <ChatBubble key={i} rol={m.rol} icerik={m.icerik} />
        ))}
        {gonderiliyor && <TypingDots />}
        {tamam && <RizaOnay onOnayla={olustur} busy={olusturuluyor} />}
      </ScrollView>
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Derdinizi anlatın..."
          placeholderTextColor={renk.faint}
          onSubmitEditing={gonder}
          returnKeyType="send"
        />
        <Pressable style={s.send} onPress={gonder} disabled={gonderiliyor}>
          <Feather name="send" size={18} color={renk.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    alignItems: "center",
    backgroundColor: renk.bg,
    borderTopWidth: 1,
    borderTopColor: renk.borderSoft,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: renk.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: fontAilesi.govde,
    fontSize: 15,
    backgroundColor: renk.white,
    color: renk.ink,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: renk.green600,
    alignItems: "center",
    justifyContent: "center",
  },
});
