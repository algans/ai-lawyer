import { NextResponse } from "next/server";
import { COOKIE_ADI } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ADI, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
