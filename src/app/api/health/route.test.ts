import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = GET();
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
