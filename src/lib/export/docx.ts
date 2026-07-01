import { Document, Packer, Paragraph } from "docx";

export async function belgeyiDocx(icerik: string): Promise<Buffer> {
  const paras = icerik.split("\n").map((satir) => new Paragraph(satir));
  const doc = new Document({ sections: [{ children: paras }] });
  return Packer.toBuffer(doc);
}
