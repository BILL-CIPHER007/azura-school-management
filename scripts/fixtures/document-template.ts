import { strToU8, zipSync } from "fflate";
import { mime } from "../../src/lib/document-templates/docx";
const ns = "http://schemas.openxmlformats.org";
export function fixtureDocx(
  paragraphs: string[],
  extra: Record<string, string | Uint8Array> = {},
  inner = ""
) {
  const parts = {
    "[Content_Types].xml":
      '<Types xmlns="' +
      ns +
      '/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="' +
      mime +
      '.main+xml"/></Types>',
    "_rels/.rels":
      '<Relationships xmlns="' +
      ns +
      '/package/2006/relationships"><Relationship Id="r1" Type="' +
      ns +
      '/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    "word/document.xml":
      '<w:document xmlns:w="' +
      ns +
      '/wordprocessingml/2006/main"><w:body>' +
      paragraphs
        .map((s) => "<w:p><w:r><w:t>" + s.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</w:t></w:r></w:p>")
        .join("") +
      inner +
      "</w:body></w:document>",
    ...extra
  };
  return Buffer.from(
    zipSync(
      Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, typeof v === "string" ? strToU8(v) : v]))
    )
  );
}
export function uploadFile(bytes: Buffer) {
  return {
    name: "modelo.docx",
    type: mime,
    size: bytes.length,
    arrayBuffer: async () => Uint8Array.from(bytes).buffer
  };
}
