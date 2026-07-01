import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";

export async function belgeyiPdf(icerik: string): Promise<Buffer> {
  const satirlar = icerik.split("\n").map((s, i) =>
    createElement(Text, { key: i, style: { marginBottom: 4 } }, s || " "));
  const doc = createElement(
    Document, null,
    createElement(Page, { size: "A4", style: { padding: 40, fontSize: 11 } },
      createElement(View, null, ...satirlar))
  );
  return renderToBuffer(doc as any);
}
