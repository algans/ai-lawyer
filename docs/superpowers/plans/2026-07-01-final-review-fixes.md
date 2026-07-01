# Final Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 4 security/correctness fixes on branch `feat/faz-2-odeme-auth`: paid-amount/currency verification in callback, ownership check in /api/generate, atomic case claim in /api/payment/init, and idempotent callback.

**Architecture:** Each fix is a small, surgical change to an existing file. No new files. All changes are verified by existing + new tests run via docker compose.

**Tech Stack:** Next.js 14 (App Router), Prisma, Vitest, TypeScript, iyzipay SDK, docker compose for test execution.

## Global Constraints

- Branch: `feat/faz-2-odeme-auth`
- Test runner: `docker compose -f docker-compose.dev.yml run --rm app npm test`
- TypeScript check: `docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit`
- Build: `docker compose -f docker-compose.dev.yml run --rm app npm run build`
- Single commit at end covering all 4 fixes
- Do NOT require login for anonymous case generation (Fix 2 must preserve this)
- Currency constant is `"TRY"` (defined in `src/lib/pricing.ts` as `PARA_BIRIMI`)

---

### Task 1: Fix 1 — Verify paidPrice + currency in callbackDogrula

**Files:**
- Modify: `src/lib/payment/provider.ts`
- Modify: `src/lib/payment/iyzico.ts`
- Modify: `src/lib/payment/iyzico.test.ts`
- Modify: `src/app/api/payment/callback/route.ts`
- Modify: `src/app/api/payment/callback/route.test.ts`

**Interfaces:**
- `callbackDogrula(token: string): Promise<{ basarili: boolean; iyzicoRef: string; paidPrice: number; currency: string }>`
- Callback route now reads `paidPrice` and `currency` from the result and compares against `payment.tutar` and `"TRY"`

- [ ] **Step 1: Update the PaymentProvider interface**

In `src/lib/payment/provider.ts`, change `callbackDogrula` return type:

```typescript
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
```

- [ ] **Step 2: Update iyzicoProvider.callbackDogrula implementation**

In `src/lib/payment/iyzico.ts`, change `callbackDogrula` to return `paidPrice` and `currency`:

```typescript
  async callbackDogrula(token: string) {
    const result = await retrieve(token);
    return {
      basarili: result?.paymentStatus === "SUCCESS",
      iyzicoRef: result?.paymentId ?? "",
      paidPrice: Number(result?.paidPrice),
      currency: result?.currency ?? "",
    };
  },
```

- [ ] **Step 3: Update iyzico.test.ts mocks to include paidPrice and currency**

In `src/lib/payment/iyzico.test.ts`, update the two existing `callbackDogrula` tests so mock responses include `paidPrice: "99"` and `currency: "TRY"`, and update the assertion for the success case:

```typescript
  it("callbackDogrula returns basarili=true when paymentStatus SUCCESS", async () => {
    checkoutForm.retrieve.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "success", paymentStatus: "SUCCESS", paymentId: "pay1", paidPrice: "99", currency: "TRY" }));
    expect(await iyzicoProvider.callbackDogrula("tok1")).toEqual({
      basarili: true,
      iyzicoRef: "pay1",
      paidPrice: 99,
      currency: "TRY",
    });
  });
  it("callbackDogrula returns basarili=false when not SUCCESS", async () => {
    checkoutForm.retrieve.mockImplementation((_req: any, cb: any) =>
      cb(null, { status: "success", paymentStatus: "FAILURE", paymentId: "pay1", paidPrice: "99", currency: "TRY" }));
    expect((await iyzicoProvider.callbackDogrula("tok1")).basarili).toBe(false);
  });
```

- [ ] **Step 4: Update callback route to verify paidPrice and currency**

In `src/app/api/payment/callback/route.ts`, replace the current success block with amount/currency validation. The `payment` record from DB has a `tutar` field. Only unlock if `basarili && paidPrice === payment.tutar && currency === "TRY"`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { iyzicoProvider } from "@/lib/payment/iyzico";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const base = process.env.APP_URL ?? "";
  if (!token) return NextResponse.redirect(`${base}/hesap?odeme=basarisiz`, 303);

  const { basarili, iyzicoRef, paidPrice, currency } = await iyzicoProvider.callbackDogrula(token);
  const payment = await prisma.payment.findFirst({ where: { iyzicoRef: token } });
  if (!payment) return NextResponse.redirect(`${base}/hesap?odeme=basarisiz`, 303);

  // Fix 4: Idempotency — already processed
  if (payment.durum === "basarili") return NextResponse.redirect(`${base}/hesap?odeme=basarili`, 303);

  // Fix 1: Verify paidPrice and currency match what we expect
  if (basarili && paidPrice === payment.tutar && currency === "TRY") {
    await prisma.payment.update({ where: { id: payment.id }, data: { durum: "basarili", iyzicoRef } });
    await prisma.document.update({ where: { id: payment.documentId }, data: { durum: "odendi" } });
    return NextResponse.redirect(`${base}/hesap?odeme=basarili`, 303);
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { durum: "basarisiz" } });
  return NextResponse.redirect(`${base}/hesap?odeme=basarisiz`, 303);
}
```

- [ ] **Step 5: Update callback route tests**

In `src/app/api/payment/callback/route.test.ts`:
1. Update the mock hoisted setup to use `callbackDogrula` returning `{ basarili, iyzicoRef, paidPrice, currency }`.
2. Update existing "success" tests to include `paidPrice: 99, currency: "TRY"` in mock return and `paymentFindFirst` to return `{ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" }`.
3. Update failure tests: mock returns `{ basarili: false, iyzicoRef: "", paidPrice: 0, currency: "" }`, payment mock returns `{ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" }`.
4. Add a test: `basarili: true` but `paidPrice: 1` → document NOT unlocked, redirect basarisiz.
5. Add a test: `basarili: true`, `paidPrice: 99` but `currency: "USD"` → document NOT unlocked, redirect basarisiz.
6. Add a test: `payment.durum === "basarili"` (already processed) → redirect basarili, `documentUpdate` NOT called again (Fix 4).

Full updated test file content:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const { paymentFindFirst, paymentUpdate, documentUpdate, callbackDogrula } = vi.hoisted(() => ({
  paymentFindFirst: vi.fn(),
  paymentUpdate: vi.fn(),
  documentUpdate: vi.fn(),
  callbackDogrula: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: {
  payment: { findFirst: paymentFindFirst, update: paymentUpdate },
  document: { update: documentUpdate },
} }));

vi.mock("@/lib/payment/iyzico", () => ({ iyzicoProvider: { callbackDogrula } }));

import { POST } from "./route";

function formReq(token: string) {
  return new Request("http://t/api/payment/callback", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }).toString(),
  });
}

describe("POST /api/payment/callback", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.APP_URL = "http://t"; });

  it("marks document odendi and redirects on success", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("odeme=basarili");
    expect(documentUpdate).toHaveBeenCalledWith({ where: { id: "d1" }, data: { durum: "odendi" } });
    expect(paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ durum: "basarili" }) }));
  });

  it("does NOT unlock document on failed verification", async () => {
    callbackDogrula.mockResolvedValue({ basarili: false, iyzicoRef: "", paidPrice: 0, currency: "" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
  });

  it("[SECURITY] fake success flag in body cannot unlock document — verification is server-side only", async () => {
    callbackDogrula.mockResolvedValue({ basarili: false, iyzicoRef: "", paidPrice: 0, currency: "" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const req = new Request("http://t/api/payment/callback", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: "tok1", status: "success", basarili: "true" }).toString(),
    });
    const res = await POST(req as any);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
  });

  it("redirects basarisiz when payment not found in DB", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue(null);
    const res = await POST(formReq("tok_unknown") as any);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it("redirects basarisiz when token is missing", async () => {
    const req = new Request("http://t/api/payment/callback", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(callbackDogrula).not.toHaveBeenCalled();
    expect(documentUpdate).not.toHaveBeenCalled();
  });

  it("updates payment iyzicoRef to real paymentId on success", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "real-pay-id-123", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { durum: "basarili", iyzicoRef: "real-pay-id-123" },
    });
    expect(res.headers.get("location")).toContain("odeme=basarili");
  });

  it("marks payment as basarisiz on failed verification", async () => {
    callbackDogrula.mockResolvedValue({ basarili: false, iyzicoRef: "", paidPrice: 0, currency: "" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    await POST(formReq("tok1") as any);
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { durum: "basarisiz" } });
  });

  it("[SECURITY] paidPrice mismatch — basarili:true but paidPrice:1 does NOT unlock document", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 1, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { durum: "basarisiz" } });
  });

  it("[SECURITY] currency mismatch — basarili:true but currency:USD does NOT unlock document", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 99, currency: "USD" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "bekliyor" });
    const res = await POST(formReq("tok1") as any);
    expect(res.headers.get("location")).toContain("odeme=basarisiz");
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { durum: "basarisiz" } });
  });

  it("[IDEMPOTENCY] double callback — payment already basarili — does NOT call documentUpdate again", async () => {
    callbackDogrula.mockResolvedValue({ basarili: true, iyzicoRef: "pay1", paidPrice: 99, currency: "TRY" });
    paymentFindFirst.mockResolvedValue({ id: "p1", documentId: "d1", tutar: 99, durum: "basarili" });
    const res = await POST(formReq("tok1") as any);
    expect(res.headers.get("location")).toContain("odeme=basarili");
    expect(documentUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
  });
});
```

### Task 2: Fix 2 — Ownership check in /api/generate

**Files:**
- Modify: `src/app/api/generate/route.ts`
- Modify: `src/app/api/generate/route.test.ts`

**Interfaces:**
- `oturumCurrentUser(req): Promise<{ userId: string } | null>` — from `@/lib/auth`
- If `kayit.userId` is set AND (no session OR session.userId !== kayit.userId) → 404
- If `kayit.userId` is null → allow (anonymous pre-login generation)

- [ ] **Step 1: Add ownership check to generate route**

In `src/app/api/generate/route.ts`, add import for `oturumCurrentUser` and the ownership check after loading `kayit`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { generateDocument } from "@/lib/ai/generator";
import { maskPreview } from "@/lib/preview";
import { caseClassification } from "@/lib/case";
import { oturumCurrentUser } from "@/lib/auth";

const Body = z.object({ caseId: z.string().min(1), ton: z.enum(["resmi", "sert", "uzlasmaci"]).optional() });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek: caseId gerekli." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek: caseId gerekli." }, { status: 400 });
  const { caseId, ton } = parsed.data;

  const kayit = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kayit) return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });

  // Fix 2: Ownership check — reject if case owned by a different user
  if (kayit.userId) {
    const oturum = await oturumCurrentUser(req);
    if (!oturum || oturum.userId !== kayit.userId) {
      return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
    }
  }

  if (!kayit.bilgiTamam) return NextResponse.json({ error: "Bilgiler henüz tamamlanmadı." }, { status: 409 });

  const classification = caseClassification(kayit);
  if (!classification) return NextResponse.json({ error: "Vaka sınıflandırması eksik." }, { status: 409 });

  const history = await prisma.message.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  const toplananBilgi = history.map((m) => `${m.rol}: ${m.icerik}`).join("\n");

  const icerik = await generateDocument({ classification, toplananBilgi, ton });
  const doc = await prisma.document.create({
    data: { caseId, tip: classification.belgeTipi, merci: classification.merci, icerik, durum: "taslak" },
  });
  return NextResponse.json({ documentId: doc.id, onizleme: maskPreview(icerik) });
}
```

- [ ] **Step 2: Update generate route tests**

In `src/app/api/generate/route.test.ts`:
1. Add `oturumCurrentUser` to the hoisted mocks (returns null by default so existing anonymous tests pass).
2. Update `vi.mock("@/lib/db", ...)` — existing mock returns case with no `userId` field, which means `kayit.userId` is `undefined`/falsy, so anonymous tests still pass.
3. Add ONE new test: case with `userId: "owner"`, request has no session (null) → 404, `generateDocument` NOT called.

The existing case mock returns `{ id: "c1", kategori: "tuketici", belgeTipi: "THH", merci: "İlçe THH", eksikBilgiler: [], bilgiTamam: true }` — no `userId` field, so `kayit.userId` is `undefined` (falsy). The ownership check `if (kayit.userId)` is false → ownership check skipped → existing tests all still pass.

Updated test file:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules BEFORE imports — vi.mock is hoisted to top of file by Vitest.
const { oturumCurrentUser } = vi.hoisted(() => ({
  oturumCurrentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", () => ({ oturumCurrentUser }));

vi.mock("@/lib/db", () => ({
  default: {
    case: {
      findUnique: vi.fn().mockResolvedValue({
        id: "c1",
        kategori: "tuketici",
        belgeTipi: "THH",
        merci: "İlçe THH",
        eksikBilgiler: [],
        bilgiTamam: true,
      }),
    },
    message: {
      findMany: vi.fn().mockResolvedValue([{ rol: "user", icerik: "telefon bozuk" }]),
    },
    document: {
      create: vi.fn().mockResolvedValue({ id: "d1" }),
    },
  },
}));
vi.mock("@/lib/ai/generator", () => ({
  generateDocument: vi
    .fn()
    .mockResolvedValue(
      "GÖRÜNÜR BAŞLIK\n\nGizli birinci paragraf metni.\n\nGizli ikinci paragraf metni."
    ),
}));

import { POST } from "./route";
import prisma from "@/lib/db";
import { generateDocument } from "@/lib/ai/generator";

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    oturumCurrentUser.mockResolvedValue(null);
    vi.mocked(prisma.case.findUnique).mockResolvedValue({
      id: "c1",
      kategori: "tuketici",
      belgeTipi: "THH",
      merci: "İlçe THH",
      eksikBilgiler: [],
      bilgiTamam: true,
    } as any);
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      { rol: "user", icerik: "telefon bozuk" } as any,
    ]);
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "d1" } as any);
    vi.mocked(generateDocument).mockResolvedValue(
      "GÖRÜNÜR BAŞLIK\n\nGizli birinci paragraf metni.\n\nGizli ikinci paragraf metni."
    );
  });

  it("saves full doc but returns only masked preview (original brief assertion)", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(body.documentId).toBe("d1");
    expect(body.onizleme).not.toContain("Gizli birinci paragraf metni");
  });

  it("[SECURITY] onizleme does NOT contain any words from later paragraphs", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(body.onizleme).toContain("GÖRÜNÜR BAŞLIK");
    expect(body.onizleme).not.toContain("Gizli birinci paragraf metni");
    expect(body.onizleme).not.toContain("Gizli ikinci");
    expect(body.onizleme).toContain("█");
    expect(JSON.stringify(body)).not.toContain("Gizli ikinci paragraf metni.");
  });

  it("[PERSISTENCE] document.create is called with durum:taslak and full icerik", async () => {
    const fullText =
      "GÖRÜNÜR BAŞLIK\n\nGizli birinci paragraf metni.\n\nGizli ikinci paragraf metni.";
    vi.mocked(generateDocument).mockResolvedValueOnce(fullText);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    await POST(req as any);

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          durum: "taslak",
          icerik: fullText,
          caseId: "c1",
          tip: "THH",
          merci: "İlçe THH",
        }),
      })
    );
  });

  it("[404] returns 404 and does NOT call generateDocument or document.create when case not found", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValueOnce(null);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "nonexistent" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBeTruthy();
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("[409] returns 409 and does NOT call generateDocument when bilgiTamam is false", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValueOnce({
      id: "c1",
      kategori: "tuketici",
      belgeTipi: "THH",
      merci: "İlçe THH",
      eksikBilgiler: ["tarih"],
      bilgiTamam: false,
    } as any);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Bilgiler henüz tamamlanmadı.");
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("[409] returns 409 and does NOT call generateDocument when case classification is incomplete", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValueOnce({
      id: "c1",
      kategori: "tuketici",
      belgeTipi: null,
      merci: "İlçe THH",
      eksikBilgiler: [],
      bilgiTamam: true,
    } as any);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Vaka sınıflandırması eksik.");
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("response body never contains the full icerik string", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const rawBody = await res.text();

    expect(rawBody).not.toContain("Gizli birinci paragraf metni");
    expect(rawBody).not.toContain("Gizli ikinci paragraf metni");
  });

  it("[400] missing caseId returns 400 and does not call generateDocument or document.create", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ ton: "resmi" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Geçersiz istek: caseId gerekli.");
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("[400] non-JSON body returns 400 and does not call generateDocument or document.create", async () => {
    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Geçersiz istek: caseId gerekli.");
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("[SECURITY] owned case with different/missing session returns 404 — generateDocument NOT called", async () => {
    oturumCurrentUser.mockResolvedValue(null);
    vi.mocked(prisma.case.findUnique).mockResolvedValueOnce({
      id: "c1",
      userId: "owner",
      kategori: "tuketici",
      belgeTipi: "THH",
      merci: "İlçe THH",
      eksikBilgiler: [],
      bilgiTamam: true,
    } as any);

    const req = new Request("http://t/api/generate", {
      method: "POST",
      body: JSON.stringify({ caseId: "c1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Vaka bulunamadı");
    expect(generateDocument).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });
});
```

### Task 3: Fix 3 — Atomic case claim in /api/payment/init

**Files:**
- Modify: `src/app/api/payment/init/route.ts`
- Modify: `src/app/api/payment/init/route.test.ts`

**Interfaces:**
- Replace `prisma.case.update(...)` with `prisma.case.updateMany({ where: { id: doc.caseId, userId: null }, data: { userId: oturum.userId } })`
- The mock in tests changes from `caseUpdate` to `caseUpdateMany`

- [ ] **Step 1: Update init route to use updateMany for atomic claim**

In `src/app/api/payment/init/route.ts`, line 22: replace `await prisma.case.update(...)` with `await prisma.case.updateMany(...)`:

```typescript
  if (!doc.case.userId) await prisma.case.updateMany({ where: { id: doc.caseId, userId: null }, data: { userId: oturum.userId } });
```

Full updated route (only the claim line changes):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { oturumCurrentUser } from "@/lib/auth";
import { iyzicoProvider } from "@/lib/payment/iyzico";
import { BELGE_FIYATI } from "@/lib/pricing";

const Body = z.object({ documentId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const oturum = await oturumCurrentUser(req);
  if (!oturum) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "documentId gerekli." }, { status: 400 });

  const doc = await prisma.document.findUnique({ where: { id: parsed.data.documentId }, include: { case: true } });
  if (!doc) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  if (doc.case.userId && doc.case.userId !== oturum.userId) return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  if (!doc.case.userId) await prisma.case.updateMany({ where: { id: doc.caseId, userId: null }, data: { userId: oturum.userId } });

  const user = await prisma.user.findUnique({ where: { id: oturum.userId } });
  const { paymentPageUrl, token } = await iyzicoProvider.checkoutBaslat({
    documentId: doc.id,
    tutar: BELGE_FIYATI,
    conversationId: doc.id,
    callbackUrl: `${process.env.APP_URL}/api/payment/callback`,
    buyerEmail: user?.email ?? "musteri@example.com",
    buyerId: oturum.userId,
  });
  await prisma.payment.create({
    data: { userId: oturum.userId, documentId: doc.id, tutar: BELGE_FIYATI, durum: "bekliyor", iyzicoRef: token },
  });
  return NextResponse.json({ paymentPageUrl });
}
```

- [ ] **Step 2: Update init route tests to use caseUpdateMany**

In `src/app/api/payment/init/route.test.ts`:
1. Rename `caseUpdate` to `caseUpdateMany` in the hoisted mock and in `vi.mock("@/lib/db", ...)`.
2. Update the "claims unowned case" test assertion to use `caseUpdateMany` with the `{ where: { id: "c1", userId: null }, data: { userId: "u1" } }` call.
3. Update "does not call caseUpdate..." test to reference `caseUpdateMany`.

Full updated test file:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, paymentCreate, caseUpdateMany, userFindUnique, oturumCurrentUser, checkoutBaslat } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  paymentCreate: vi.fn(),
  caseUpdateMany: vi.fn(),
  userFindUnique: vi.fn(),
  oturumCurrentUser: vi.fn(),
  checkoutBaslat: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: {
    document: { findUnique },
    payment: { create: paymentCreate },
    case: { updateMany: caseUpdateMany },
    user: { findUnique: userFindUnique },
  },
}));

vi.mock("@/lib/auth", () => ({ oturumCurrentUser }));

vi.mock("@/lib/payment/iyzico", () => ({ iyzicoProvider: { checkoutBaslat } }));

import { POST } from "./route";

describe("POST /api/payment/init", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = "http://t";
    userFindUnique.mockResolvedValue({ id: "u1", email: "u1@test.com" });
  });

  it("401 when not logged in", async () => {
    oturumCurrentUser.mockResolvedValue(null);
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    expect((await POST(req as any)).status).toBe(401);
  });

  it("400 when body is missing documentId", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ foo: "bar" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(checkoutBaslat).not.toHaveBeenCalled();
  });

  it("400 when body is non-JSON", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    const req = new Request("http://t", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(checkoutBaslat).not.toHaveBeenCalled();
  });

  it("404 when document not found", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue(null);
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "missing" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(404);
    expect(checkoutBaslat).not.toHaveBeenCalled();
  });

  it("404 when document not owned by user", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "baskasi" } });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    expect((await POST(req as any)).status).toBe(404);
    expect(checkoutBaslat).not.toHaveBeenCalled();
  });

  it("claims unowned case atomically then starts checkout", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: null } });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok2" });
    paymentCreate.mockResolvedValue({ id: "p2" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(caseUpdateMany).toHaveBeenCalledWith({ where: { id: "c1", userId: null }, data: { userId: "u1" } });
    expect(checkoutBaslat).toHaveBeenCalled();
    expect((await res.json()).paymentPageUrl).toBe("https://iyz/pay");
  });

  it("starts checkout and returns paymentPageUrl", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "u1" } });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok1" });
    paymentCreate.mockResolvedValue({ id: "p1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    const res = await POST(req as any);
    expect((await res.json()).paymentPageUrl).toBe("https://iyz/pay");
    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ durum: "bekliyor", tutar: 99, iyzicoRef: "tok1" }),
      })
    );
  });

  it("callbackUrl uses APP_URL env var", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "u1" } });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok1" });
    paymentCreate.mockResolvedValue({ id: "p1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    await POST(req as any);
    expect(checkoutBaslat).toHaveBeenCalledWith(
      expect.objectContaining({ callbackUrl: "http://t/api/payment/callback" })
    );
  });

  it("does not call caseUpdateMany when case already has userId matching current user", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "u1" } });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok1" });
    paymentCreate.mockResolvedValue({ id: "p1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    await POST(req as any);
    expect(caseUpdateMany).not.toHaveBeenCalled();
  });

  it("response body only contains paymentPageUrl and does not leak document content", async () => {
    oturumCurrentUser.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "d1", caseId: "c1", case: { userId: "u1" }, icerik: "gizli belge icerigi" });
    checkoutBaslat.mockResolvedValue({ paymentPageUrl: "https://iyz/pay", token: "tok1" });
    paymentCreate.mockResolvedValue({ id: "p1" });
    const req = new Request("http://t", { method: "POST", body: JSON.stringify({ documentId: "d1" }) });
    const res = await POST(req as any);
    const rawBody = await res.text();
    expect(rawBody).not.toContain("gizli belge icerigi");
    expect(rawBody).toContain("paymentPageUrl");
  });
});
```

---

## Execution

All 4 fixes (1+4 in callback, 2 in generate, 3 in init) are applied in the tasks above. After all files are updated:

1. Run tests: `docker compose -f docker-compose.dev.yml run --rm app npm test`
2. Type check: `docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit`
3. Build: `docker compose -f docker-compose.dev.yml run --rm app npm run build`
4. Commit: `git add -A && git commit -m "fix(faz2): callback tutar/currency doğrulaması + generate sahiplik kontrolü + atomik claim + idempotent callback"`
5. Append summary to `/Users/seferalgan/projects/Deneysel/ai-lawyer/.superpowers/sdd/final-review-fixes.md`
