import path from "node:path/posix";
import * as zip from "yauzl";
import { SaxesParser, type SaxesTagNS } from "saxes";
import sharp from "sharp";
import type { DocumentTemplateType } from "@prisma/client";
import { check, tokens, TemplateError } from "../document-template-placeholders";

export const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const limit = 1024 * 1024;
const word = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const pkg = "http://schemas.openxmlformats.org/package/2006/";
export type Block =
  | { text: string; bold?: boolean; center?: boolean; pageBreak?: boolean }
  | { image: Buffer };
const allowed =
  /^(?:\[Content_Types\]\.xml|_rels\/\.rels|docProps\/(?:core|app|custom)\.xml|docProps\/thumbnail\.jpe?g|word\/(?:document|styles|stylesWithEffects|numbering|settings|webSettings|fontTable|header\d+|footer\d+)\.xml|word\/_rels\/(?:document|header\d+|footer\d+)\.xml\.rels|word\/theme\/theme\d+\.xml|word\/media\/[\w-]+\.(?:png|jpe?g))$/i;
function unpack(bytes: Buffer) {
  return new Promise<Map<string, Buffer>>((resolve, reject) => {
    zip.fromBuffer(
      bytes,
      { lazyEntries: true, strictFileNames: true, validateEntrySizes: true },
      (err, z) => {
        if (err || !z) return reject(new TemplateError("Pacote DOCX inválido."));
        const files = new Map<string, Buffer>(),
          seen = new Set<string>();
        let total = 0;
        const fail = () => {
          z.close();
          reject(new TemplateError("Estrutura ou tamanho do DOCX não permitido."));
        };
        z.on("error", fail)
          .on("end", () => resolve(files))
          .on("entry", (entry: zip.Entry) => {
            const name = entry.fileName;
            if (name.endsWith("/") && /^(word\/(media\/|theme\/|_rels\/)?|docProps\/|_rels\/)$/.test(name))
              return z.readEntry();
            if (
              !allowed.test(name) ||
              seen.has(name.toLowerCase()) ||
              entry.isEncrypted() ||
              ![0, 8].includes(entry.compressionMethod) ||
              entry.uncompressedSize > 3 * limit ||
              (total += entry.uncompressedSize) > 8 * limit
            )
              return fail();
            seen.add(name.toLowerCase());
            z.openReadStream(entry, (e, stream) => {
              if (e || !stream) return fail();
              const chunks: Buffer[] = [];
              let length = 0;
              stream
                .on("error", fail)
                .on("data", (chunk: Buffer) => {
                  if ((length += chunk.length) > entry.uncompressedSize) {
                    stream.destroy();
                    fail();
                  } else chunks.push(chunk);
                })
                .on("end", () => {
                  if (length !== entry.uncompressedSize) return fail();
                  files.set(name, Buffer.concat(chunks));
                  z.readEntry();
                });
            });
          });
        if (z.entryCount > 160) return fail();
        z.readEntry();
      }
    );
  });
}
function xml(
  data: Buffer,
  open: (t: SaxesTagNS, depth: number) => void,
  close?: (t: SaxesTagNS) => void,
  text?: (v: string) => void
) {
  const parser = new SaxesParser({ xmlns: true });
  let depth = 0,
    count = 0;
  parser.on("doctype", () => {
    throw new TemplateError("DTD não permitido.");
  });
  parser.on("processinginstruction", () => {
    throw new TemplateError("Instruções XML não permitidas.");
  });
  parser.on("opentag", (t) => {
    check(++depth <= 72 && ++count <= 75000, "XML excede o limite de complexidade.");
    check(
      !/^(?:object|OLEObject|altChunk|control|script|instrText|fldSimple|fldChar|attachedTemplate|subDoc|movie|binData|dataBinding|pict)$/i.test(
        t.local
      ),
      "O modelo contém campos ativos ou objetos não suportados."
    );
    open(t, depth);
  });
  parser.on("closetag", (t) => {
    close?.(t);
    depth--;
  });
  parser.on("text", (v) => text?.(v));
  parser.on("cdata", (v) => text?.(v));
  parser.write(new TextDecoder("utf-8", { fatal: true }).decode(data)).close();
}
function attr(t: SaxesTagNS, name: string) {
  const namespace = name === "embed" ? rel : t.uri === word ? word : "";
  return Object.values(t.attributes).find((a) => a.local === name && a.uri === namespace)?.value ?? "";
}
export async function inspectDocx(bytes: Buffer, type: DocumentTemplateType) {
  check(
    bytes.length >= 4 && bytes.length <= limit && bytes.readUInt32LE(0) === 0x04034b50,
    "Envie um DOCX válido de até 1 MB."
  );
  try {
    const files = await unpack(bytes),
      relations = new Map<string, string>(),
      images = new Map<string, Buffer>();
    let main = false,
      root = false,
      pixels = 0;
    for (const [p, data] of files) {
      if (/\.(png|jpe?g)$/i.test(p)) {
        const isPng = p.toLowerCase().endsWith(".png");
        check(
          isPng
            ? data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
            : data.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")),
          "Assinatura de imagem inválida."
        );
        const decoder = sharp(data, { limitInputPixels: 4000000, failOn: "error" }),
          info = await decoder.metadata();
        pixels += (info.width ?? 0) * (info.height ?? 0);
        check(
          pixels <= 12000000 &&
            info.format === (p.toLowerCase().endsWith(".png") ? "png" : "jpeg") &&
            (info.pages ?? 1) === 1,
          "Imagem não suportada ou limite de pixels excedido."
        );
        if (p.startsWith("word/media/"))
          images.set(
            p,
            await decoder
              .resize({ width: 900, height: 450, fit: "inside", withoutEnlargement: true })
              .png()
              .toBuffer()
          );
        continue;
      }
      xml(data, (t, depth) => {
        if (p === "[Content_Types].xml") {
          if (depth === 1)
            check(t.uri === pkg + "content-types" && t.local === "Types", "Manifesto inválido.");
          const ct = attr(t, "ContentType");
          check(!/macro|vba|script|oleobject|html|svg|activex/i.test(ct), "Conteúdo ativo não permitido.");
          if (t.local === "Override" && attr(t, "PartName") === "/word/document.xml")
            main = ct === mime + ".main+xml";
        }
        if (!p.endsWith(".rels")) return;
        if (depth === 1)
          check(t.local === "Relationships" && t.uri === pkg + "relationships", "Relações inválidas.");
        if (t.local !== "Relationship") return;
        const target = attr(t, "Target"),
          kind = attr(t, "Type"),
          id = attr(t, "Id");
        check(
          !attr(t, "TargetMode") || attr(t, "TargetMode") === "Internal",
          "Referência externa não permitida."
        );
        check(
          /^[\w./\[\]-]+$/.test(target) && !target.includes("..") && !target.startsWith("//"),
          "Destino de relação inválido."
        );
        const source = p === "_rels/.rels" ? "" : p.replace("/_rels/", "/").replace(/\.rels$/, "");
        const dest = path.join(target.startsWith("/") ? "" : path.dirname(source), target).replace(/^\//, "");
        check(files.has(dest) && !relations.has(source + "#" + id), "Relação ausente ou duplicada.");
        check(
          /\/(?:officeDocument|core-properties|extended-properties|custom-properties|thumbnail|styles|stylesWithEffects|settings|numbering|webSettings|fontTable|theme|image|header|footer)$/.test(
            kind
          ),
          "Tipo de relação não suportado."
        );
        relations.set(source + "#" + id, dest);
        if (!source && kind === rel + "/officeDocument" && dest === "word/document.xml") root = true;
      });
    }
    check(main && root, "O arquivo não é um documento Word DOCX.");
    const blocks: Block[] = [],
      used = new Set<string>();
    const doc = "word/document.xml",
      linked = [...relations].filter(([key]) => key.startsWith(doc + "#")).map(([, p]) => p);
    for (const p of [
      ...new Set([
        ...linked.filter((p) => /^word\/header/.test(p)),
        doc,
        ...linked.filter((p) => /^word\/footer/.test(p))
      ])
    ]) {
      let paragraph: Extract<Block, { text: string }> | undefined,
        inText = false;
      xml(
        files.get(p)!,
        (t, depth) => {
          if (depth === 1)
            check(
              t.uri === word && t.local === (p === doc ? "document" : p.includes("header") ? "hdr" : "ftr"),
              "Parte Word inválida."
            );
          if (t.uri === word) {
            check(
              t.local !== "tbl",
              "Tabelas fixas não são suportadas. Para notas, use {{subjectsTable}} em um parágrafo separado."
            );
            if (t.local === "p") {
              check(!paragraph, "Parágrafo aninhado não suportado.");
              paragraph = { text: "" };
            }
            if (t.local === "t") inText = true;
            if (paragraph && t.local === "b") paragraph.bold = attr(t, "val") !== "0";
            if (paragraph && t.local === "jc") paragraph.center = attr(t, "val") === "center";
            if (paragraph && t.local === "br") {
              if (attr(t, "type") === "page") paragraph.pageBreak = true;
              else paragraph.text += "\n";
            }
            if (paragraph && t.local === "tab") paragraph.text += "  ";
          }
          if (t.local === "blip" && t.uri === "http://schemas.openxmlformats.org/drawingml/2006/main") {
            const image = images.get(relations.get(p + "#" + attr(t, "embed")) ?? "");
            check(image, "Imagem incorporada não encontrada.");
            blocks.push({ image });
          }
        },
        (t) => {
          if (t.uri !== word) return;
          if (t.local === "t") inText = false;
          if (t.local === "p" && paragraph) {
            check(paragraph.text.length <= 10000, "Parágrafo longo demais.");
            tokens(paragraph.text, type).forEach((key) => used.add(key));
            blocks.push(paragraph);
            paragraph = undefined;
          }
        },
        (v) => {
          if (inText && paragraph) paragraph.text += v;
        }
      );
    }
    check(
      blocks.length <= 1200 && blocks.some((b) => "image" in b || b.text.trim()),
      "Documento vazio ou longo demais."
    );
    return { blocks, placeholders: [...used].sort() };
  } catch (e) {
    if (e instanceof TemplateError) throw e;
    throw new TemplateError("O DOCX não pôde ser lido com segurança.");
  }
}
