import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted — factories must not reference out-of-scope variables.
const GIZLI_METIN = "GİZLİ TAM METİN — SADECE ÖDENMİŞ SAHİBİNE DÖNMELI";

vi.mock("@/lib/auth", () => ({
  oturumCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: {
    document: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "./route";
import { oturumCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";

// Helper to build a NextRequest-like object with a given cookie
function makeReq(cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = cookie;
  return new Request("http://localhost/api/document/doc-1", { headers });
}

// Helper to build params as a Promise<{ id: string }>
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/document/[id]", () => {
  const OWNER_ID = "user-owner";
  const OTHER_ID = "user-other";
  const DOC_ID = "doc-1";

  const paidDoc = {
    id: DOC_ID,
    icerik: GIZLI_METIN,
    tip: "THH",
    merci: "İlçe THH",
    durum: "odendi",
    case: { userId: OWNER_ID },
  };

  const unpaidDoc = {
    id: DOC_ID,
    icerik: GIZLI_METIN,
    tip: "THH",
    merci: "İlçe THH",
    durum: "taslak",
    case: { userId: OWNER_ID },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 401 — no session
  // -----------------------------------------------------------------------
  it("[401] returns 401 when there is no active session", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue(null);

    const res = await GET(makeReq() as any, makeParams(DOC_ID));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeTruthy();
    // prisma must not be called at all
    expect(prisma.document.findUnique).not.toHaveBeenCalled();
  });

  it("[SECURITY][401] raw response body does not contain icerik when no session", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue(null);
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await GET(makeReq() as any, makeParams(DOC_ID));
    const rawBody = await res.text();

    expect(res.status).toBe(401);
    expect(rawBody).not.toContain(GIZLI_METIN);
  });

  // -----------------------------------------------------------------------
  // 404 — document belongs to a different user
  // -----------------------------------------------------------------------
  it("[404] returns 404 when document belongs to a different owner", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OTHER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await GET(makeReq("oturum=tok") as any, makeParams(DOC_ID));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBeTruthy();
  });

  it("[SECURITY][404] raw response body does not contain icerik for wrong owner", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OTHER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await GET(makeReq("oturum=tok") as any, makeParams(DOC_ID));
    const rawBody = await res.text();

    expect(res.status).toBe(404);
    expect(rawBody).not.toContain(GIZLI_METIN);
  });

  it("[404] returns 404 when document does not exist", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

    const res = await GET(makeReq("oturum=tok") as any, makeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // 402 — document not paid (durum === "taslak")
  // -----------------------------------------------------------------------
  it("[402] returns 402 when document durum is taslak (not paid)", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(unpaidDoc as any);

    const res = await GET(makeReq("oturum=tok") as any, makeParams(DOC_ID));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe("Belge için ödeme gerekli.");
  });

  it("[SECURITY][402] raw response body does NOT contain icerik when durum is taslak", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(unpaidDoc as any);

    const res = await GET(makeReq("oturum=tok") as any, makeParams(DOC_ID));
    const rawBody = await res.text();

    expect(res.status).toBe(402);
    // Critical: the full icerik must NEVER appear in the 402 response
    expect(rawBody).not.toContain(GIZLI_METIN);
  });

  // -----------------------------------------------------------------------
  // 200 — owner + odendi → full icerik returned
  // -----------------------------------------------------------------------
  it("[200] returns full icerik when owner has paid", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await GET(makeReq("oturum=tok") as any, makeParams(DOC_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.icerik).toBe(GIZLI_METIN);
    expect(body.tip).toBe("THH");
    expect(body.merci).toBe("İlçe THH");
  });

  it("[200] response body contains icerik tip and merci — nothing else sensitive", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await GET(makeReq("oturum=tok") as any, makeParams(DOC_ID));
    const body = await res.json();

    // Exactly the three fields specified by the interface
    expect(Object.keys(body).sort()).toEqual(["icerik", "merci", "tip"].sort());
    expect(body.icerik).toBe(GIZLI_METIN);
  });

  // -----------------------------------------------------------------------
  // Correctness: prisma is called with correct id
  // -----------------------------------------------------------------------
  it("calls prisma.document.findUnique with the route id and includes case", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    await GET(makeReq("oturum=tok") as any, makeParams(DOC_ID));

    expect(prisma.document.findUnique).toHaveBeenCalledWith({
      where: { id: DOC_ID },
      include: { case: true },
    });
  });
});
