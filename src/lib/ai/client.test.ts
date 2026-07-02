import { describe, it, expect, vi, beforeEach } from "vitest";

const { create, usageLogCreate } = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "merhaba" }],
    usage: { input_tokens: 10, output_tokens: 20 },
  }),
  usageLogCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create }; },
}));

vi.mock("@/lib/db", () => ({
  default: { usageLog: { create: usageLogCreate } },
}));

vi.mock("./cost", () => ({
  tahminiMaliyetKurus: vi.fn().mockReturnValue(42),
}));

import { callClaude, MODELS } from "./client";

describe("callClaude", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({
      content: [{ type: "text", text: "merhaba" }],
      usage: { input_tokens: 10, output_tokens: 20 },
    });
    usageLogCreate.mockResolvedValue({});
  });

  it("returns concatenated text from content blocks", async () => {
    const out = await callClaude({ model: MODELS.fast, system: "s", user: "u" });
    expect(out).toBe("merhaba");
    expect(create).toHaveBeenCalled();
  });

  it("does NOT call prisma.usageLog.create when logMeta is not provided", async () => {
    await callClaude({ model: MODELS.fast, system: "s", user: "u" });
    expect(usageLogCreate).not.toHaveBeenCalled();
  });

  it("calls prisma.usageLog.create with correct data when logMeta is provided", async () => {
    await callClaude({
      model: MODELS.quality,
      system: "s",
      user: "u",
      logMeta: { caseId: "case-123", asama: "uretim" },
    });
    expect(usageLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        caseId: "case-123",
        asama: "uretim",
        model: MODELS.quality,
        inputToken: 10,
        outputToken: 20,
      }),
    });
  });

  it("calls prisma.usageLog.create without caseId when not provided", async () => {
    await callClaude({
      model: MODELS.fast,
      system: "s",
      user: "u",
      logMeta: { asama: "ozkontrol" },
    });
    expect(usageLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        caseId: null,
        asama: "ozkontrol",
      }),
    });
  });

  it("does not throw when prisma.usageLog.create fails (best-effort)", async () => {
    usageLogCreate.mockRejectedValueOnce(new Error("DB error"));
    await expect(
      callClaude({
        model: MODELS.fast,
        system: "s",
        user: "u",
        logMeta: { asama: "uretim" },
      })
    ).resolves.toBe("merhaba");
  });
});
