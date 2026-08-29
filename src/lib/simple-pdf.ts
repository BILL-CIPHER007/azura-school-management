type PdfTextOptions = {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: "left" | "right" | "center";
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

function hexToRgb(color = "#0b2d63") {
  const normalized = color.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  const number = Number.parseInt(value, 16);

  return {
    r: ((number >> 16) & 255) / 255,
    g: ((number >> 8) & 255) / 255,
    b: (number & 255) / 255
  };
}

function normalizePdfText(value: string) {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/[^\t\n\r\u0020-\u00ff]/g, "");
}

function escapePdfText(value: string) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r?\n/g, "\\n");
}

function textWidth(value: string, size: number) {
  return normalizePdfText(value).length * size * 0.47;
}

function wrapText(value: string, maxWidth: number, size: number) {
  const words = normalizePdfText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (line && textWidth(nextLine, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export class SimplePdf {
  private pages: string[][] = [[]];
  private y = PAGE_HEIGHT - MARGIN;

  private get ops() {
    return this.pages[this.pages.length - 1];
  }

  private addPage() {
    this.pages.push([]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private ensureSpace(height: number) {
    if (this.y - height < MARGIN) this.addPage();
  }

  text(value: string, x = MARGIN, options: PdfTextOptions = {}) {
    const size = options.size ?? 10;
    const lineHeight = size + 4;
    const maxWidth = PAGE_WIDTH - MARGIN - x;
    const lines = wrapText(value, maxWidth, size);

    this.ensureSpace(lines.length * lineHeight);

    for (const line of lines) {
      const { r, g, b } = hexToRgb(options.color);
      const font = options.bold ? "F2" : "F1";
      const lineWidth = textWidth(line, size);
      const textX =
        options.align === "right" ? PAGE_WIDTH - MARGIN - lineWidth : options.align === "center" ? (PAGE_WIDTH - lineWidth) / 2 : x;

      this.ops.push(
        `BT /${font} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${textX.toFixed(2)} ${this.y.toFixed(
          2
        )} Tm (${escapePdfText(line)}) Tj ET`
      );
      this.y -= lineHeight;
    }
  }

  row(columns: Array<{ text: string; width: number; bold?: boolean; color?: string }>, options: { size?: number } = {}) {
    const size = options.size ?? 9;
    const lineHeight = size + 5;
    const height = lineHeight * Math.max(...columns.map((column) => wrapText(column.text, column.width - 8, size).length), 1);
    this.ensureSpace(height + 6);

    let x = MARGIN;
    const startY = this.y;
    for (const column of columns) {
      const lines = wrapText(column.text, column.width - 8, size);
      let lineY = startY;
      for (const line of lines) {
        const { r, g, b } = hexToRgb(column.color ?? "#0b2d63");
        const font = column.bold ? "F2" : "F1";
        this.ops.push(
          `BT /${font} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${(x + 4).toFixed(2)} ${lineY.toFixed(
            2
          )} Tm (${escapePdfText(line)}) Tj ET`
        );
        lineY -= lineHeight;
      }
      x += column.width;
    }

    this.y -= height + 6;
  }

  heading(title: string, subtitle?: string) {
    this.text(title, MARGIN, { size: 17, bold: true, color: "#0b2d63" });
    if (subtitle) this.text(subtitle, MARGIN, { size: 10, color: "#5b6b82" });
    this.y -= 8;
  }

  section(title: string) {
    this.ensureSpace(28);
    this.y -= 4;
    this.text(title, MARGIN, { size: 12, bold: true, color: "#0b2d63" });
  }

  gap(size = 10) {
    this.ensureSpace(size);
    this.y -= size;
  }

  line() {
    this.ensureSpace(12);
    this.ops.push(
      `0.84 0.88 0.94 RG ${MARGIN} ${this.y.toFixed(2)} m ${(PAGE_WIDTH - MARGIN).toFixed(2)} ${this.y.toFixed(2)} l S`
    );
    this.y -= 12;
  }

  build() {
    const objects: string[] = [];
    const contentObjectIds: number[] = [];
    const pageObjectIds: number[] = [];

    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

    for (const pageOps of this.pages) {
      const stream = pageOps.join("\n");
      const contentId = objects.length + 1;
      contentObjectIds.push(contentId);
      objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);

      const pageId = objects.length + 1;
      pageObjectIds.push(pageId);
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
      );
    }

    objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

    const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xff\xff\xff\xff\n", "latin1")];
    const offsets = [0];

    objects.forEach((object, index) => {
      offsets.push(Buffer.concat(chunks).length);
      chunks.push(Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, "latin1"));
    });

    const xrefOffset = Buffer.concat(chunks).length;
    const xref = [
      "xref",
      `0 ${objects.length + 1}`,
      "0000000000 65535 f ",
      ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
      "trailer",
      `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
      "startxref",
      String(xrefOffset),
      "%%EOF"
    ].join("\n");
    chunks.push(Buffer.from(xref, "latin1"));

    return Buffer.concat(chunks);
  }
}
