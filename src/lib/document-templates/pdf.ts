import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { check, type TemplateData } from "../document-template-placeholders";
import type { Block } from "./docx";
import { readWordGrid, subjectTableXml } from "./word-table";

export async function renderBlocks(blocks: Block[], data: TemplateData) {
  const pdf = await PDFDocument.create(),
    regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const chars = new Set(regular.getCharacterSet());
  const safe = (s: string) =>
    Array.from(s)
      .map((c) => (c === "\n" || chars.has(c.codePointAt(0)!) ? c : " "))
      .join("");
  let page = pdf.addPage([595, 842]),
    y = 790;
  function next() {
    check(pdf.getPageCount() < 180, "O documento excede o limite de páginas.");
    page = pdf.addPage([595, 842]);
    y = 790;
  }
  function wrap(value: string, width: number, font: PDFFont, size: number) {
    const lines: string[] = [];
    for (const par of safe(value).split("\n")) {
      let line = "";
      for (const w of par.split(/\s+/)) {
        if (!w) continue;
        if (line && font.widthOfTextAtSize(line + " " + w, size) > width) {
          lines.push(line);
          line = "";
        }
        if (font.widthOfTextAtSize(w, size) > width) {
          for (const ch of w) {
            if (font.widthOfTextAtSize(line + ch, size) > width) {
              lines.push(line);
              line = "";
            }
            line += ch;
          }
        } else line += (line ? " " : "") + w;
      }
      lines.push(line);
    }
    return lines;
  }
  function paragraph(s: string, strong = false, center = false) {
    const font = strong ? bold : regular,
      size = 11;
    for (const line of wrap(s, 493, font, size)) {
      if (y < 58) next();
      page.drawText(line, { x: center ? (595 - font.widthOfTextAtSize(line, size)) / 2 : 51, y, font, size });
      y -= 16;
    }
    y -= 4;
  }
  function tables() {
    for (const table of data.tables ?? []) {
      if (y < 130) next();
      paragraph(table.title, true);
      const grid = readWordGrid(subjectTableXml(table)),
        total = grid.widths.reduce((a, b) => a + b, 0);
      const widths = grid.widths.map((w) => (493 * w) / total);
      function row(cells: string[], header: boolean) {
        const font = header ? bold : regular,
          size = 8;
        const lines = cells.map((c, i) => wrap(c, widths[i] - 8, font, size)),
          h = Math.max(...lines.map((l) => l.length)) * 11 + 9;
        check(h < 620, "Linha da tabela excede a página.");
        if (y - h < 48) {
          next();
          if (!header) row(table.headers, true);
        }
        let x = 51;
        for (const [i, col] of lines.entries()) {
          page.drawRectangle({
            x,
            y: y - h,
            width: widths[i],
            height: h,
            borderColor: rgb(0.8, 0.84, 0.88),
            borderWidth: 0.4,
            color: header ? rgb(0.9, 0.94, 0.98) : rgb(1, 1, 1)
          });
          col.forEach((l, j) => page.drawText(l, { x: x + 4, y: y - 12 - j * 11, font, size }));
          x += widths[i];
        }
        y -= h;
      }
      row(grid.headers, true);
      for (const cells of grid.rows) row(cells, false);
      y -= 12;
    }
  }
  for (const b of blocks) {
    if ("image" in b) {
      const im = await pdf.embedPng(b.image);
      const k = Math.min(1, 390 / im.width, 105 / im.height);
      if (y - im.height * k < 52) next();
      y -= im.height * k;
      page.drawImage(im, { x: 51, y, width: im.width * k, height: im.height * k });
      y -= 8;
      continue;
    }
    if (b.pageBreak && y < 790) next();
    if (b.text.trim() === "{{subjectsTable}}") {
      tables();
      continue;
    }
    paragraph(
      b.text.replace(/\{\{([^{}]+)\}\}/g, (_, key: string) => data.values[key] ?? "Não informado"),
      b.bold,
      b.center
    );
  }
  return Buffer.from(await pdf.save());
}
