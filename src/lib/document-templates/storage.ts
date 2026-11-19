import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { check } from "../document-template-placeholders";
import { limit, mime } from "./docx";
import { isTemplateType } from "../document-template-placeholders";
import { privateBlob } from "./private-blob";

export const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
export function newKey(schoolId: string, type: string, version: number) {
  check(Number.isSafeInteger(version) && version>0 && /^[\w-]+$/.test(schoolId) && isTemplateType(type),"Chave inválida.");
  return "schools/" + schoolId + "/document-templates/" + type + "/v" + version + "/" + randomUUID() + ".docx";
}
export function validKey(schoolId:string,type:string,key:string,version:number,legacy=false) {
  const prefix="schools/"+schoolId+"/document-templates/"+type+"/";
  if(!/^[\w-]+$/.test(schoolId)||!isTemplateType(type)||!key.startsWith(prefix)||!Number.isSafeInteger(version)||version<1)return false;
  const suffix=key.slice(prefix.length), folder="v"+version+"/";
  const id=suffix.startsWith(folder)?suffix.slice(folder.length):legacy?suffix:"";
  return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.docx$/.test(id);
}
async function access(
  schoolId: string,
  type: string,
  key: string,
  version: number,
  method: "GET" | "PUT" | "DELETE",
  data?: Buffer
) {
  check(
    validKey(schoolId,type,key,version,method==="GET"),
    "Chave de arquivo inválida."
  );
  if(process.env.VERCEL || process.env.DOCUMENT_STORAGE_PROVIDER==="vercel-blob"){
    return privateBlob(method,key,data);
  }
  check(!process.env.DOCUMENT_STORAGE_PROVIDER || process.env.DOCUMENT_STORAGE_PROVIDER==="local","Provider de documentos inválido.");
  const endpoint = process.env.DOCUMENT_STORAGE_BUCKET_URL;
  if (endpoint && !process.env.DOCUMENT_STORAGE_PROVIDER) {
    check(method==="GET","O storage S3 legado permite somente leitura.");
    const url = new URL(endpoint.replace(/\/$/, "") + "/" + key);
    const accessKeyId = process.env.DOCUMENT_STORAGE_ACCESS_KEY,
      secretAccessKey = process.env.DOCUMENT_STORAGE_SECRET_KEY;
    check(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        accessKeyId &&
        secretAccessKey,
      "Storage privado não configurado."
    );
    const client = new AwsClient({
      service: "s3",
      region: process.env.DOCUMENT_STORAGE_REGION || "auto",
      accessKeyId,
      secretAccessKey,
      retries: 0
    });
    const response = await client.fetch(url.href, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      ...(data ? { body: new Uint8Array(data), headers: { "Content-Type": mime, "If-None-Match": "*" } } : {})
    });
    if (!response.ok) throw new Error("Storage HTTP " + response.status);
    if (method === "GET") {
      check(Number(response.headers.get("content-length") ?? 0) <= limit, "Objeto muito grande.");
      const reader = response.body!.getReader(),
        chunks: Buffer[] = [];
      let n = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if ((n += value.length) > limit) {
          await reader.cancel();
          throw new Error("Objeto muito grande");
        }
        chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks);
    }
    return Buffer.alloc(0);
  }
  check(
    !process.env.VERCEL && (process.env.NODE_ENV !== "production" || process.env.DOCUMENT_STORAGE_DIR),
    "Configure o storage privado de documentos."
  );
  const root = path.resolve(
      /* turbopackIgnore: true */ process.env.DOCUMENT_STORAGE_DIR || ".private-documents"
    ),
    target = path.join(/* turbopackIgnore: true */ root, key);
  check(!root.startsWith(path.resolve("public")), "O storage deve ser privado.");
  if (method === "PUT") {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data!, { flag: "wx", mode: 0o600 });
  }
  if (method === "GET") return readFile(target);
  if (method === "DELETE") await unlink(target);
  return Buffer.alloc(0);
}
export const storeFile = (s:string,t:string,k:string,v:number,b:Buffer) => access(s,t,k,v,"PUT",b);
export const removeFile = (s:string,t:string,k:string,v:number) => access(s,t,k,v,"DELETE");
export async function readOriginal(row: {
  schoolId: string;
  type: string;
  version: number;
  storageKey: string;
  digest: string;
  sizeBytes: number;
}) {
  const bytes = await access(row.schoolId,row.type,row.storageKey,row.version,"GET");
  check(
    bytes.length === row.sizeBytes && bytes.length <= limit && digest(bytes) === row.digest,
    "Integridade do modelo inválida."
  );
  return bytes;
}
