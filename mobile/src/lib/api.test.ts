import { apiFetch } from "./api";

describe("apiFetch", () => {
  afterEach(() => jest.restoreAllMocks());

  it("başarılı yanıtta JSON gövdesini döndürür ve Bearer ekler", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch" as never)
      .mockResolvedValue({ ok: true, json: async () => ({ caseId: "c1" }) } as never);
    const data = await apiFetch<{ caseId: string }>("/api/chat", {
      method: "POST",
      body: { mesaj: "selam" },
      token: "abc",
    });
    expect(data.caseId).toBe("c1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/chat$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
    expect(JSON.parse(init.body as string)).toEqual({ mesaj: "selam" });
  });

  it("hata yanıtında { status, message } fırlatır (server error alanını kullanır)", async () => {
    jest.spyOn(global, "fetch" as never).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Vaka bulunamadı" }),
    } as never);
    await expect(apiFetch("/api/generate", { method: "POST" })).rejects.toMatchObject({
      status: 404,
      message: "Vaka bulunamadı",
    });
  });

  it("token yoksa Authorization başlığı eklenmez", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch" as never)
      .mockResolvedValue({ ok: true, json: async () => ({}) } as never);
    await apiFetch("/api/health");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
