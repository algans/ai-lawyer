export function kullaniciMetniSarmala(metin: string): string {
  const temiz = metin.replaceAll("</kullanici_girdisi>", "<\\/kullanici_girdisi>");
  return `<kullanici_girdisi>\n${temiz}\n</kullanici_girdisi>`;
}
