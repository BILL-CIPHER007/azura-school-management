import { SaxesParser } from "saxes";
import type { TemplateData } from "../document-template-placeholders";
import { check } from "../document-template-placeholders";

export type Grid = { widths: number[]; headers: string[]; rows: string[][] };
const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const escape = (v: string) =>
  Array.from(v)
    .filter((c) => c.charCodeAt(0) >= 32 || "\n\r\t".includes(c))
    .join("")
    .replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
// Native Word table, not tab-separated text. Widths are in twentieths of a point.
export function subjectTableXml(table: NonNullable<TemplateData["tables"]>[number]) {
  const n = table.headers.length;
  check(n >= 2 && n <= 32, "Número de colunas não suportado.");
  const subject = Math.min(3100, Math.round((9860 / n) * 1.55)),
    widths = table.headers.map((_, i) => (i ? Math.floor((9860 - subject) / (n - 1)) : subject));
  const row = (cells: string[], header: boolean) =>
    "<w:tr><w:trPr><w:cantSplit/>" +
    (header ? "<w:tblHeader/>" : "") +
    "</w:trPr>" +
    cells
      .map(
        (s, i) =>
          '<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="' +
          widths[i] +
          '"/>' +
          (header ? '<w:shd w:fill="E6EFF9"/>' : "") +
          "</w:tcPr><w:p><w:r>" +
          (header ? "<w:rPr><w:b/></w:rPr>" : "") +
          '<w:t xml:space="preserve">' +
          escape(s) +
          "</w:t></w:r></w:p></w:tc>"
      )
      .join("") +
    "</w:tr>";
  return (
    '<w:tbl xmlns:w="' +
    ns +
    '"><w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr><w:tblGrid>' +
    widths.map((w) => '<w:gridCol w:w="' + w + '"/>').join("") +
    "</w:tblGrid>" +
    row(table.headers, true) +
    table.rows.map((r) => row(r, false)).join("") +
    "</w:tbl>"
  );
}
export function readWordGrid(xml: string): Grid {
  const widths: number[] = [],
    rows: string[][] = [];
  let cell = "",
    inside = false;
  const p = new SaxesParser({ xmlns: true });
  p.on("opentag", (t) => {
    if (t.uri !== ns) return;
    if (t.local === "gridCol") widths.push(Number(t.attributes["w:w"]?.value));
    if (t.local === "tr") rows.push([]);
    if (t.local === "tc") cell = "";
    if (t.local === "t") inside = true;
  });
  p.on("text", (s) => {
    if (inside) cell += s;
  });
  p.on("closetag", (t) => {
    if (t.uri !== ns) return;
    if (t.local === "t") inside = false;
    if (t.local === "tc") rows.at(-1)!.push(cell);
  });
  p.write(xml).close();
  return { widths, headers: rows.shift()!, rows };
}
