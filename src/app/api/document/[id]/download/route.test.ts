import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures mocks are set up before module imports
const mockBelgeyiPdf = vi.hoisted(() => vi.fn());
const mockBelgeyiDocx = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/export/pdf", () => ({
  belgeyiPdf: mockBelgeyiPdf,
}));

vi.mock("@/lib/export/docx", () => ({
  belgeyiDocx: mockBelgeyiDocx,
}));

import { GET } from "./route";
import { oturumCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";

function makeReq(url: string, cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = cookie;
  return new Request(url, { headers });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/document/[id]/download", () => {
  const OWNER_ID = "user-owner";
  const OTHER_ID = "user-other";
  const DOC_ID = "doc-1";
  const DOC_ICERIK = "Test belge içeriği.\nİkinci satır.";

  const paidDoc = {
    id: DOC_ID,
    icerik: DOC_ICERIK,
    tip: "THH",
    merci: "İlçe THH",
    durum: "odendi",
    case: { userId: OWNER_ID },
  };

  const unpaidDoc = {
    id: DOC_ID,
    icerik: DOC_ICERIK,
    tip: "THH",
    merci: "İlçe THH",
    durum: "taslak",
    case: { userId: OWNER_ID },
  };

  const PDF_BUFFER = Buffer.from("%PDF-fake-content");
  const DOCX_BUFFER = Buffer.from("PK\x03\x04fake-docx-content");

  beforeEach(() => {
    vi.clearAllMocks();
    mockBelgeyiPdf.mockResolvedValue(PDF_BUFFER);
    mockBelgeyiDocx.mockResolvedValue(DOCX_BUFFER);
  });

  // -----------------------------------------------------------------------
  // 401 — no session
  // -----------------------------------------------------------------------
  it("[401] returns 401 when there is no active session", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue(null);

    const res = await GET(
      makeReq("http://localhost/api/document/doc-1/download") as any,
      makeParams(DOC_ID)
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeTruthy();
    expect(prisma.document.findUnique).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 404 — wrong owner
  // -----------------------------------------------------------------------
  it("[404] returns 404 when document belongs to a different owner", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OTHER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await GET(
      makeReq("http://localhost/api/document/doc-1/download", "oturum=tok") as any,
      makeParams(DOC_ID)
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBeTruthy();
    expect(mockBelgeyiPdf).not.toHaveBeenCalled();
    expect(mockBelgeyiDocx).not.toHaveBeenCalled();
  });

  it("[404] returns 404 when document does not exist", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

    const res = await GET(
      makeReq("http://localhost/api/document/nonexistent/download", "oturum=tok") as any,
      makeParams("nonexistent")
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBeTruthy();
    expect(mockBelgeyiPdf).not.toHaveBeenCalled();
    expect(mockBelgeyiDocx).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 402 — unpaid → generators NOT called
  // -----------------------------------------------------------------------
  it("[402] returns 402 when document is not paid (durum=taslak)", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(unpaidDoc as any);

    const res = await GET(
      makeReq("http://localhost/api/document/doc-1/download", "oturum=tok") as any,
      makeParams(DOC_ID)
    );
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe("Belge için ödeme gerekli.");
    // Critical: generators must NOT be called for unpaid documents
    expect(mockBelgeyiPdf).not.toHaveBeenCalled();
    expect(mockBelgeyiDocx).not.toHaveBeenCalled();
  });

  it("[402] generators are not called even with format=docx when unpaid", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(unpaidDoc as any);

    const res = await GET(
      makeReq("http://localhost/api/document/doc-1/download?format=docx", "oturum=tok") as any,
      makeParams(DOC_ID)
    );

    expect(res.status).toBe(402);
    expect(mockBelgeyiPdf).not.toHaveBeenCalled();
    expect(mockBelgeyiDocx).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 200 — owner + paid + pdf (default)
  // -----------------------------------------------------------------------
  it("[200] returns pdf with correct Content-Type when owner has paid (default format)", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await GET(
      makeReq("http://localhost/api/document/doc-1/download", "oturum=tok") as any,
      makeParams(DOC_ID)
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain(`belge-${DOC_ID}.pdf`);
    expect(mockBelgeyiPdf).toHaveBeenCalledWith(DOC_ICERIK);
    expect(mockBelgeyiDocx).not.toHaveBeenCalled();
  });

  it("[200] returns pdf with correct Content-Type when format=pdf explicitly", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await GET(
      makeReq("http://localhost/api/document/doc-1/download?format=pdf", "oturum=tok") as any,
      makeParams(DOC_ID)
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(mockBelgeyiPdf).toHaveBeenCalledWith(DOC_ICERIK);
    expect(mockBelgeyiDocx).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 200 — owner + paid + docx
  // -----------------------------------------------------------------------
  it("[200] returns docx with correct Content-Type when owner has paid and format=docx", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await GET(
      makeReq("http://localhost/api/document/doc-1/download?format=docx", "oturum=tok") as any,
      makeParams(DOC_ID)
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain(`belge-${DOC_ID}.docx`);
    expect(mockBelgeyiDocx).toHaveBeenCalledWith(DOC_ICERIK);
    expect(mockBelgeyiPdf).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Correctness: prisma called with correct args
  // -----------------------------------------------------------------------
  it("calls prisma.document.findUnique with the route id and includes case", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    await GET(
      makeReq("http://localhost/api/document/doc-1/download", "oturum=tok") as any,
      makeParams(DOC_ID)
    );

    expect(prisma.document.findUnique).toHaveBeenCalledWith({
      where: { id: DOC_ID },
      include: { case: true },
    });
  });
});
