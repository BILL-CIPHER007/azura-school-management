import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, access, readdir } from "node:fs/promises";
import { once } from "node:events";
import { head, list } from "@vercel/blob";
import { selectedBlobStore } from "../src/lib/document-templates/private-blob";
import { readOriginal,removeFile,storeFile,validKey } from "../src/lib/document-templates/storage";
import { createServer } from "node:net";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { changeTemplate, uploadTemplate } from "../src/services/document-templates";
import type { SessionUser } from "../src/lib/session";
import { fixtureDocx, uploadFile } from "./fixtures/document-template";

export async function runDocumentHomologation(remote=false) {
  const dbUrl = process.env.DATABASE_URL;
  assert.ok(
    dbUrl && ["localhost", "127.0.0.1"].includes(new URL(dbUrl).hostname),
    "Use apenas PostgreSQL local."
  );
  assert.ok(!process.env.DOCUMENT_STORAGE_BUCKET_URL && !process.env.VERCEL, "Não usar storage remoto.");
  assert.notEqual(process.env.VERCEL_ENV,"production");
  if(remote){
    assert.equal(process.env.DOCUMENT_STORAGE_PROVIDER,"vercel-blob");
    selectedBlobStore();
    await list({storeId:selectedBlobStore(),prefix:"azura-qa-preflight/",limit:1});
  }else{assert.ok(!process.env.DOCUMENT_STORAGE_PROVIDER || process.env.DOCUMENT_STORAGE_PROVIDER==="local","Use o script de storage para Blob.");}
  const standalone = path.resolve(".next/standalone/server.js");
  await access(standalone);
  const root = await mkdtemp(path.resolve("node_modules/qa-modelos-"));
  process.env.DOCUMENT_STORAGE_DIR = root;
  process.env.AUTH_SECRET = randomUUID() + randomUUID();
  const { signSession } = await import("../src/lib/session");
  const made: string[] = [];
  let child: ChildProcess | undefined;
  async function stop(){if(child && child.exitCode===null && !child.signalCode){const closed=once(child,"exit");child.kill();await closed;}child=undefined;}
  async function school(pro: boolean) {
    const s = await prisma.school.create({
      data: {
        name: "QA Modelos",
        slug: "qa-modelos-" + randomUUID(),
        plan: pro ? "PROFISSIONAL" : "ESSENCIAL"
      }
    });
    made.push(s.id);
    async function user(role: SessionUser["role"]) {
      return prisma.user.create({
        data: {
          schoolId: s.id,
          name: "QA " + role,
          email: role + "@example.invalid",
          passwordHash: "unused",
          role
        },
        select: { id: true, email: true, schoolId: true, role: true, name: true }
      });
    }
    const admin = await user("ADMIN"),
      aluno = await user("ALUNO"),
      guardian = await user("RESPONSAVEL"), teacher=await user("PROFESSOR");
    const student = await prisma.student.create({
      data: { schoolId: s.id, userId: aluno.id, fullName: "Aluno de teste" }
    });
    await prisma.guardian.create({
      data: {
        schoolId: s.id,
        userId: guardian.id,
        fullName: "Responsável de teste",
        relation: "Responsável",
        students: { create: { studentId: student.id } }
      }
    });
    const year = await prisma.academicYear.create({
      data: {
        schoolId: s.id,
        year: 2026,
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("2026-12-31"),
        isActive: true
      }
    });
    const room = await prisma.classroom.create({
      data: { schoolId: s.id, academicYearId: year.id, name: "A", gradeLevel: "6", shift: "MATUTINO" }
    });
    await prisma.enrollment.create({
      data: {
        schoolId: s.id,
        studentId: student.id,
        academicYearId: year.id,
        classroomId: room.id,
        registration: "QA001",
        enrolledAt: new Date()
      }
    });
    return { admin, aluno, guardian, teacher, student };
  }
  try {
    const portProbe = createServer();
    await new Promise<void>((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
    const addr = portProbe.address();
    assert.ok(addr && typeof addr === "object");
    const port = addr.port;
    await new Promise<void>((resolve) => portProbe.close(() => resolve()));
    const base = "http://127.0.0.1:" + port;
    async function start(){child = spawn(process.execPath, [standalone], {
      windowsHide: true,
      env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", DATABASE_URL: dbUrl },
      stdio: "ignore"
    });
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(base + "/api/documentos/historico")).status === 401) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(ready, "O build standalone não iniciou.");
    }
    await start();
    const a = await school(true),
      b = await school(false),
      type = "DECLARACAO_MATRICULA";
    const prefix = "/api/documentos/",
      slug = "declaracao-matricula";
    async function request(actor: SessionUser, url: string, status = 200) {
      const cookie = "school_session=" + (await signSession(actor));
      const res = await fetch(base + url, {
        headers: { Cookie: cookie },
        redirect: "manual",
        signal: AbortSignal.timeout(20000)
      });
      assert.equal(res.status, status, url.split("?")[0]);
      return res;
    }
    async function pdf(actor: SessionUser, url: string, custom?: boolean) {
      const r = await request(actor, url);
      assert.match(r.headers.get("content-type") ?? "", /application\/pdf/);
      assert.equal(
        Buffer.from(await r.arrayBuffer())
          .subarray(0, 4)
          .toString(),
        "%PDF"
      );
      if (custom !== undefined)
        assert.equal(/-v\d+\.pdf/.test(r.headers.get("content-disposition") ?? ""), custom);
    }
    const template = (mark: string) =>
      uploadFile(fixtureDocx([mark + " {{school.name}}", "{{student.name}}"]));
    const settings = "/admin/configuracoes/documentos/modelos";
    await assert.rejects(uploadTemplate({...a.admin,id:randomUUID()},type,"DB rollback",template("Rollback")));
    assert.equal(await prisma.documentTemplate.count({where:{schoolId:a.admin.schoolId}}),0);
    const tenantPrefix="schools/"+a.admin.schoolId+"/document-templates/";
    if(remote) assert.equal((await list({storeId:selectedBlobStore(),prefix:tenantPrefix,limit:1})).blobs.length,0);
    else assert.deepEqual(await readdir(path.join(root,tenantPrefix,type,"v1")),[]);
    const page = await (await request(a.admin, settings)).text();
    const form = page.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)?.find((html) => html.includes('type="file"'));
    const action = form?.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
    assert.ok(action, "Formulário de upload não encontrado");
    const body = new FormData();
    body.set(action, "");
    body.set("event", "upload");
    body.set("name", "Primeira");
    body.set("type", type);
    const original = template("A1");
    body.set("file", new Blob([await original.arrayBuffer()], { type: original.type }), original.name);
    const posted = await fetch(base + settings, {
      method: "POST",
      redirect: "manual",
      body,
      headers: { Origin: base, Cookie: "school_session=" + (await signSession(a.admin)) }
    });
    assert.equal(posted.status, 303);
    assert.ok(posted.headers.get("location")?.includes("ok=1"), "Upload recusado");
    const one = await prisma.documentTemplate.findFirstOrThrow({
      where: { schoolId: a.admin.schoolId, type, version: 1 }
    });
    assert.ok((await (await request(a.admin, settings)).text()).includes("Primeira"));
    assert.equal(one.status, "DRAFT");
    await assert.rejects(changeTemplate(a.admin, one.id, "activate"));
    await assert.rejects(uploadTemplate(a.aluno, type, "Negado", template("X")));
    await assert.rejects(
      uploadTemplate(a.admin, type, "Inválido", { ...template("X"), name: "modelo.docm" })
    );
    await assert.rejects(uploadTemplate(a.admin, type, "Inválido", { ...template("X"), type: "text/html" }));
    const aUrl = prefix + slug + "?studentId=" + a.student.id,
      bUrl = prefix + slug + "?studentId=" + b.student.id;
    await pdf(a.admin, aUrl, false);
    await pdf(a.admin, aUrl + "&modelo=" + one.id);
    assert.ok(validKey(a.admin.schoolId,type,one.storageKey,1));
    assert.equal(one.originalName,original.name);assert.equal(one.mimeType,original.type);assert.equal(one.sizeBytes,original.size);
    if(remote){
      const object=await head(one.storageKey,{storeId:selectedBlobStore()});
      const url=new URL(object.url);
      assert.ok(url.protocol==="https:" && url.hostname.endsWith(".private.blob.vercel-storage.com") && !url.search);
      const anonymous=await fetch(url,{redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(10000)});
      await anonymous.body?.cancel();
      assert.ok([401,403,404].includes(anonymous.status),"Download sem autenticação não foi negado.");
    }
    await stop();await start();
    await pdf(a.admin,aUrl+"&modelo="+one.id);
    await changeTemplate(a.admin, one.id, "activate");
    await pdf(a.admin, aUrl, true);
    const two = await uploadTemplate(a.admin, type, "Segunda", template("A2"));
    assert.equal(two.version, 2);
    const other = await uploadTemplate(b.admin, type, "Outra escola", template("B1"));
    assert.equal(other.version, 1);
    await request(b.admin, bUrl + "&modelo=" + two.id, 422);
    await assert.rejects(changeTemplate(b.admin, two.id, "activate"));
    await pdf(b.admin, bUrl + "&modelo=" + other.id);
    await changeTemplate(b.admin, other.id, "activate");
    await pdf(a.admin, aUrl + "&modelo=" + two.id);
    await changeTemplate(a.admin, two.id, "activate");
    assert.equal(
      (await prisma.documentTemplate.findUniqueOrThrow({ where: { id: one.id } })).status,
      "ARCHIVED"
    );
    assert.equal(
      await prisma.documentTemplate.count({ where: { schoolId: a.admin.schoolId, type, status: "ACTIVE" } }),
      1
    );
    const orig = "/admin/configuracoes/documentos/modelos/" + one.id + "/original";
    const r = await request(a.admin, orig);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), Buffer.from(await original.arrayBuffer()));
    assert.equal(r.headers.get("content-type"),one.mimeType);assert.match(r.headers.get("content-disposition")??"",/^attachment;/);
    await request(a.aluno, orig, 403);
    await request(a.guardian, orig,403);await request(a.teacher,orig,403);
    await request(b.admin, orig, 404);
    await request(a.admin,settings+"/"+other.id+"/original",404);
    assert.ok(!(await (await request(b.admin,settings)).text()).includes(one.id));
    assert.ok(!(await (await request(a.admin,settings)).text()).includes(other.id));
    await prisma.documentPolicy.create({
      data: {
        schoolId: a.admin.schoolId,
        documentType: type,
        studentCanDownload: false,
        guardianCanDownload: false
      }
    });
    await request(a.aluno, prefix + slug, 403);
    await request(a.guardian, aUrl, 403);
    await pdf(a.admin, aUrl, true);
    await pdf(b.aluno, prefix + slug, true);
    const saved=await readOriginal(two);
    await removeFile(two.schoolId,type,two.storageKey,two.version);
    try {
      await pdf(a.admin, aUrl, false);
    } finally {
      await storeFile(two.schoolId,type,two.storageKey,two.version,saved);
    }
    for (const [kind, url] of [
      ["BOLETIM", "boletim"],
      ["HISTORICO_ESCOLAR", "historico"]
    ] as const) {
      const model = await uploadTemplate(
        a.admin,
        kind,
        kind,
        uploadFile(fixtureDocx(["{{student.name}}", "{{subjectsTable}}"]))
      );
      const p = prefix + url + "?studentId=" + a.student.id;
      await pdf(a.admin, p + "&modelo=" + model.id);
      await changeTemplate(a.admin, model.id, "activate");
      await pdf(a.aluno, prefix + url, true);
    }
    const c = await prisma.charge.create({
      data: {
        studentId: a.student.id,
        schoolId: a.admin.schoolId,
        reference: "QA",
        amount: 15,
        dueDate: new Date()
      }
    });
    const receipt = prefix + "recibo?chargeId=" + c.id;
    await request(a.admin, receipt, 409);
    await request(b.admin, receipt, 403);
    await prisma.charge.update({ where: { id: c.id }, data: { status: "PAID", paidAt: new Date() } });
    await pdf(a.admin, receipt, false);
    await request(a.aluno, receipt, 403);
    await assert.rejects(uploadTemplate(b.admin, "RECIBO", "Negado", template("X")));
    const receiptModel = await uploadTemplate(
      a.admin,
      "RECIBO",
      "Recibo",
      uploadFile(fixtureDocx(["{{charge.amount}}", "{{charge.paidAt}}", "{{student.name}}"]))
    );
    await pdf(a.admin, receipt + "&modelo=" + receiptModel.id);
    await changeTemplate(a.admin, receiptModel.id, "activate");
    await pdf(a.admin, receipt, true);
    await changeTemplate(a.admin, two.id, "restore");
    await pdf(a.admin, aUrl, false);
    await pdf(b.admin, bUrl, true);
    const logs = await prisma.auditLog.findMany({
      where: { schoolId: a.admin.schoolId, entity: "DocumentTemplate", entityId: two.id },
      orderBy: { createdAt: "asc" }
    });
    assert.deepEqual(
      logs.map((l) => l.action),
      ["template.uploaded", "template.validated", "template.activated", "template.restored"]
    );
    assert.ok(logs.every((l) => l.userId === a.admin.id));
    console.log(
      "Homologação HTTP local: 2 escolas; 4 tipos; prévia, versões, acesso, auditoria e fallback OK."
    );
  } finally {
    await stop();
    for (const schoolId of made) {
      if(remote){
        const rows=await prisma.documentTemplate.findMany({where:{schoolId}});
        for(const row of rows)await removeFile(schoolId,row.type,row.storageKey,row.version);
        const remaining=await list({storeId:selectedBlobStore(),prefix:"schools/"+schoolId+"/document-templates/",limit:1});
        assert.equal(remaining.blobs.length,0,"Blobs de teste remanescentes.");
      }
      await prisma.charge.deleteMany({ where: { schoolId } });
      await prisma.enrollment.deleteMany({ where: { schoolId } });
      await prisma.school.delete({ where: { id: schoolId } });
      assert.equal(await prisma.documentTemplate.count({where:{schoolId}}),0);
    }
    assert.equal(path.dirname(root), path.resolve("node_modules"));
    assert.ok(path.basename(root).startsWith("qa-modelos-"));
    await rm(root, { recursive: true, force: true });
  }
}
if(require.main===module)runDocumentHomologation()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
