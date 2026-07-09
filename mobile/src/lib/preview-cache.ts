// generate yanıtındaki maskeli önizlemeyi ekranlar arası taşımak için hafif in-memory cache.
const cache = new Map<string, string>();
export function setOnizleme(id: string, metin: string) {
  cache.set(id, metin);
}
export function getOnizleme(id: string): string | undefined {
  return cache.get(id);
}
