import { describe, it, expect, vi } from "vitest";

const { create } = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "merhaba" }],
  }),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create }; },
}));

import { callClaude, MODELS } from "./client";

describe("callClaude", () => {
  it("returns concatenated text from content blocks", async () => {
    const out = await callClaude({ model: MODELS.fast, system: "s", user: "u" });
    expect(out).toBe("merhaba");
    expect(create).toHaveBeenCalled();
  });
});
