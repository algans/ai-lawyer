import { NextRequest, NextResponse } from "next/server";
import { oturumCurrentUser } from "@/lib/auth";

// Üst menünün "Giriş" / "Hesabım" durumunu doğru göstermesi için oturum var/yok bilgisi.
// Bilinçli olarak yalnızca boolean döner; userId veya başka kimlik bilgisi sızdırmaz.
export async function GET(req: NextRequest) {
  const oturum = await oturumCurrentUser(req);
  return NextResponse.json({ girisYapildi: oturum !== null });
}
