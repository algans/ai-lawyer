import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/ai/client", () => ({
  callClaude: vi.fn(),
  MODELS: { fast: "claude-haiku-4-5-20251001", quality: "claude-opus-4-8" },
}));

import { POST } from "./route";
import { oturumCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { callClaude } from "@/lib/ai/client";

function makeReq(body: unknown, cookie?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["cookie"] = cookie;
  return new Request("http://localhost/api/rehber", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/rehber", () => {
  const OWNER_ID = "user-owner";
  const OTHER_ID = "user-other";
  const DOC_ID = "doc-1";

  const paidDoc = {
    id: DOC_ID,
    tip: "THH",
    merci: "İlçe THH",
    durum: "odendi",
    case: { userId: OWNER_ID },
  };

  const unpaidDoc = {
    id: DOC_ID,
    tip: "THH",
    merci: "İlçe THH",
    durum: "taslak",
    case: { userId: OWNER_ID },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[401] returns 401 when there is no active session", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue(null);

    const res = await POST(makeReq({ documentId: DOC_ID }) as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeTruthy();
    expect(callClaude).not.toHaveBeenCalled();
  });

  it("[404] returns 404 when document belongs to a different owner", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OTHER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);

    const res = await POST(makeReq({ documentId: DOC_ID }, "oturum=tok") as any);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBeTruthy();
    expect(callClaude).not.toHaveBeenCalled();
  });

  it("[402] returns 402 when document is not paid (callClaude NOT called)", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(unpaidDoc as any);

    const res = await POST(makeReq({ documentId: DOC_ID }, "oturum=tok") as any);
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBeTruthy();
    expect(callClaude).not.toHaveBeenCalled();
  });

  it("[200] returns {rehber} when owner has paid (callClaude mocked)", async () => {
    vi.mocked(oturumCurrentUser).mockResolvedValue({ userId: OWNER_ID });
    vi.mocked(prisma.document.findUnique).mockResolvedValue(paidDoc as any);
    vi.mocked(callClaude).mockResolvedValue("1. Belgenizi ilçe THH'ye elden teslim edebilirsiniz.");

    const res = await POST(makeReq({ documentId: DOC_ID }, "oturum=tok") as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rehber).toBe("1. Belgenizi ilçe THH'ye elden teslim edebilirsiniz.");
    expect(callClaude).toHaveBeenCalledOnce();
    expect(callClaude).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
        system: expect.stringContaining("Türk hukuk"),
        user: expect.stringContaining("THH"),
      })
    );
  });
});
