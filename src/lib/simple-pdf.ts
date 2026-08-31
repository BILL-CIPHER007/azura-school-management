type PdfTextOptions = {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: "left" | "right" | "center";
};

type PdfTableColumn = {
  text: string;
  width: number;
  align?: "left" | "right" | "center";
};

type PdfTableCell = {
  text: string;
  bold?: boolean;
  color?: string;
  align?: "left" | "right" | "center";
};

type PdfTableOptions = {
  size?: number;
  headerFill?: string;
  headerColor?: string;
  borderColor?: string;
  zebraFill?: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const FOOTER_HEIGHT = 52;

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
  private footer?: { left: string; right?: string };

  private get ops() {
    return this.pages[this.pages.length - 1];
  }

  private addPage() {
    this.pages.push([]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  ensureSpace(height: number) {
    if (this.y - height < MARGIN + FOOTER_HEIGHT) this.addPage();
  }

  private textOp(value: string, x: number, y: number, options: PdfTextOptions = {}) {
    const size = options.size ?? 10;
    const { r, g, b } = hexToRgb(options.color);
    const font = options.bold ? "F2" : "F1";
    const lineWidth = textWidth(value, size);
    const textX =
      options.align === "right" ? PAGE_WIDTH - MARGIN - lineWidth : options.align === "center" ? (PAGE_WIDTH - lineWidth) / 2 : x;

    return `BT /${font} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${textX.toFixed(
      2
    )} ${y.toFixed(2)} Tm (${escapePdfText(value)}) Tj ET`;
  }

  private rectOp(x: number, y: number, width: number, height: number, options: { fill?: string; stroke?: string; strokeWidth?: number }) {
    const ops: string[] = [];
    if (options.fill) {
      const { r, g, b } = hexToRgb(options.fill);
      ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
    }
    if (options.stroke) {
      const { r, g, b } = hexToRgb(options.stroke);
      ops.push(
        `${(options.strokeWidth ?? 0.8).toFixed(2)} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x.toFixed(
          2
        )} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`
      );
    }
    return ops;
  }

  get pageWidth() {
    return PAGE_WIDTH;
  }

  get pageHeight() {
    return PAGE_HEIGHT;
  }

  get margin() {
    return MARGIN;
  }

  get contentWidth() {
    return PAGE_WIDTH - MARGIN * 2;
  }

  get cursorY() {
    return this.y;
  }

  setFooter(left: string, right?: string) {
    this.footer = { left, right };
  }

  textAt(value: string, x: number, y: number, options: PdfTextOptions = {}) {
    this.ops.push(this.textOp(value, x, y, options));
  }

  rect(x: number, y: number, width: number, height: number, options: { fill?: string; stroke?: string; strokeWidth?: number }) {
    this.ops.push(...this.rectOp(x, y, width, height, options));
  }

  lineAt(x1: number, y1: number, x2: number, y2: number, color = "#d7e2f0", width = 0.8) {
    const { r, g, b } = hexToRgb(color);
    this.ops.push(`${width.toFixed(2)} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  moveDown(size: number) {
    this.ensureSpace(size);
    this.y -= size;
  }

  text(value: string, x = MARGIN, options: PdfTextOptions = {}) {
    const size = options.size ?? 10;
    const lineHeight = size + 4;
    const maxWidth = PAGE_WIDTH - MARGIN - x;
    const lines = wrapText(value, maxWidth, size);

    this.ensureSpace(lines.length * lineHeight);

    for (const line of lines) {
      this.ops.push(this.textOp(line, x, this.y, options));
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
    this.lineAt(MARGIN, this.y, PAGE_WIDTH - MARGIN, this.y, "#d7e2f0");
    this.y -= 12;
  }

  table(columns: PdfTableColumn[], rows: PdfTableCell[][], options: PdfTableOptions = {}) {
    const size = options.size ?? 8;
    const lineHeight = size + 4;
    const paddingX = 6;
    const paddingY = 7;
    const headerFill = options.headerFill ?? "#062b63";
    const headerColor = options.headerColor ?? "#ffffff";
    const borderColor = options.borderColor ?? "#d7e2f0";
    const zebraFill = options.zebraFill ?? "#f6f9fe";

    const drawHeader = () => {
      const headerHeight = size + paddingY * 2;
      this.ensureSpace(headerHeight + 12);
      const y = this.y - headerHeight;
      this.rect(MARGIN, y, this.contentWidth, headerHeight, { fill: headerFill });

      let x = MARGIN;
      columns.forEach((column) => {
        const availableWidth = column.width - paddingX * 2;
        const width = textWidth(column.text, size);
        const textX =
          column.align === "right"
            ? x + paddingX + Math.max(availableWidth - width, 0)
            : column.align === "center"
              ? x + paddingX + Math.max((availableWidth - width) / 2, 0)
              : x + paddingX;
        this.textAt(column.text, textX, y + paddingY + 2, {
          size,
          bold: true,
          color: headerColor
        });
        x += column.width;
      });

      this.y = y;
    };

    drawHeader();

    rows.forEach((row, rowIndex) => {
      const cellLines = row.map((cell, cellIndex) =>
        wrapText(cell.text, Math.max(columns[cellIndex]?.width ?? 70, 20) - paddingX * 2, size)
      );
      const rowHeight = Math.max(...cellLines.map((lines) => lines.length), 1) * lineHeight + paddingY * 2;

      if (this.y - rowHeight < MARGIN + FOOTER_HEIGHT) {
        this.addPage();
        drawHeader();
      }

      const y = this.y - rowHeight;
      if (rowIndex % 2 === 1) {
        this.rect(MARGIN, y, this.contentWidth, rowHeight, { fill: zebraFill });
      }
      this.lineAt(MARGIN, y, PAGE_WIDTH - MARGIN, y, borderColor, 0.6);

      let x = MARGIN;
      row.forEach((cell, cellIndex) => {
        const column = columns[cellIndex];
        let lineY = y + rowHeight - paddingY - size;
        for (const line of cellLines[cellIndex] ?? [""]) {
          const availableWidth = Math.max((column?.width ?? 70) - paddingX * 2, 20);
          const width = textWidth(line, size);
          const align = cell.align ?? column?.align;
          const textX =
            align === "right"
              ? x + paddingX + Math.max(availableWidth - width, 0)
              : align === "center"
                ? x + paddingX + Math.max((availableWidth - width) / 2, 0)
                : x + paddingX;
          this.textAt(line, textX, lineY, {
            size,
            bold: cell.bold,
            color: cell.color ?? "#0b2d63"
          });
          lineY -= lineHeight;
        }
        x += column?.width ?? 70;
      });

      this.y = y;
    });

    this.y -= 10;
  }

  private footerOps(pageNumber: number, totalPages: number) {
    if (!this.footer) return [];

    const footerY = 34;
    const ops = [
      ...this.rectOp(0, 0, PAGE_WIDTH, FOOTER_HEIGHT - 10, { fill: "#062b63" }),
      this.textOp(this.footer.left, MARGIN, footerY, { size: 8, color: "#ffffff" }),
      this.textOp(this.footer.right ?? "Azura", PAGE_WIDTH - MARGIN - 96, footerY, { size: 8, bold: true, color: "#ffffff" }),
      this.textOp(`Pagina ${pageNumber} de ${totalPages}`, PAGE_WIDTH - MARGIN - 18, 18, { size: 7, color: "#dbeafe", align: "right" })
    ];

    return ops;
  }

  build() {
    const objects: string[] = [];
    const contentObjectIds: number[] = [];
    const pageObjectIds: number[] = [];

    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

    const totalPages = this.pages.length;
    for (const [pageIndex, pageOps] of this.pages.entries()) {
      const stream = [...pageOps, ...this.footerOps(pageIndex + 1, totalPages)].join("\n");
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
