import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { inspectDocx, limit } from "../src/lib/document-templates/docx";
import { renderBlocks } from "../src/lib/document-templates/pdf";
import { readWordGrid, subjectTableXml } from "../src/lib/document-templates/word-table";
import { fixtureDocx } from "./fixtures/document-template";

async function validate() {
  const type = "DECLARACAO_MATRICULA";
  const split = "<w:p><w:r><w:t>{{stud</w:t></w:r><w:r><w:t>ent.name}}</w:t></w:r></w:p>";
  const parsed = await inspectDocx(fixtureDocx(["{{school.name}}"], {}, split), type);
  assert.deepEqual(parsed.placeholders, ["school.name", "student.name"]);
  for (const bytes of [
    Buffer.from("invalid"),
    Buffer.alloc(limit + 1),
    fixtureDocx(["{{student.cpf}}"]),
    fixtureDocx(["{{student.name}"]),
    fixtureDocx(["{{charge.amount}}"]),
    fixtureDocx(["texto"], { "word/vbaProject.bin": Buffer.from("fixture") }),
    fixtureDocx(["texto"], { "word/media/logo.svg": "<svg/>" }),
    fixtureDocx(["texto"], {
      "word/_rels/document.xml.rels":
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r" Type="image" TargetMode="External" Target="https://example.invalid/image"/></Relationships>'
    }),
    fixtureDocx(["texto"], { "[Content_Types].xml": "<Types/>" }),
    fixtureDocx(["texto"], {}, "<w:fldSimple/>")
  ])
    await assert.rejects(inspectDocx(bytes, type));
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#123456" } })
    .png()
    .toBuffer();
  const image = await inspectDocx(
    fixtureDocx(
      ["Assinatura gráfica"],
      {
        "word/media/im.png": png,
        "word/_rels/document.xml.rels":
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/im.png"/></Relationships>'
      },
      '<w:p><w:r><w:drawing><a:blip xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="r1"/></w:drawing></w:r></w:p>'
    ),
    type
  );
  assert.ok(image.blocks.some((b) => "image" in b));
  const table = {
    title: "Ano letivo",
    headers: ["Disciplina", "Média"],
    rows: Array.from({ length: 110 }, (_, i) => ["Artes & Ciências " + i, "8,5"])
  };
  const grid = readWordGrid(subjectTableXml(table));
  assert.deepEqual(grid.rows, table.rows);
  assert.deepEqual(grid.headers, table.headers);
  const pdf = await renderBlocks([...image.blocks, { text: "{{subjectsTable}}" }], {
    values: {},
    tables: [table]
  });
  assert.ok((await PDFDocument.load(pdf)).getPageCount() > 1);
  console.log("DOCX, campos, imagens, rejeições, tabela Word e PDF paginado: OK.");
}
validate().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
