import { describe, it, expect, afterAll } from "vitest";
import prisma from "./db";

describe("db", () => {
  afterAll(async () => { await prisma.$disconnect(); });
  it("creates and reads a Case", async () => {
    const c = await prisma.case.create({ data: { baslik: "test vaka" } });
    try {
      const found = await prisma.case.findUnique({ where: { id: c.id } });
      expect(found?.baslik).toBe("test vaka");
    } finally {
      await prisma.case.delete({ where: { id: c.id } });
    }
  });
});
