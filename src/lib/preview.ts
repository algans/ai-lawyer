export function maskPreview(text: string): string {
  const paras = text.split("\n\n");
  if (paras.length <= 1) return text.slice(0, 200);
  const masked = paras.slice(1).map((p) =>
    p.replace(/\S/g, "█")
  );
  return [paras[0], ...masked].join("\n\n");
}
