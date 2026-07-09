import { getToken, setToken, clearToken } from "./token";

const store: Record<string, string> = {};
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    store[k] = v;
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    delete store[k];
  }),
}));

describe("token store", () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it("set → get round-trip", async () => {
    await setToken("jwt-123");
    expect(await getToken()).toBe("jwt-123");
  });
  it("clear siler", async () => {
    await setToken("jwt-123");
    await clearToken();
    expect(await getToken()).toBeNull();
  });
  it("hiç yazılmadıysa null döner", async () => {
    expect(await getToken()).toBeNull();
  });
});
