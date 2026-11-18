import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { canDownload, documentTypes, getDocumentPolicies, saveDocumentPolicy } from "../src/lib/document-policy";
import { prisma } from "../src/lib/prisma";

async function validate() {
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(host), "Use um banco local para validar.");
  const rollback = new Error("Fim da validação");
  await assert.rejects(prisma.$transaction(async tx => {
    const schools = await Promise.all(["A", "B"].map(name =>
      tx.school.create({ data: { name, slug: "policy-test-" + randomUUID() } })
    ));
    for (const [index, school] of schools.entries()) {
      const user = await tx.user.create({ data: { schoolId: school.id, role: "ADMIN", name: "Teste", email: "teste@example.invalid", passwordHash: "unused" } });
      const actor = { ...user, role: user.role };
      for (const { type } of Object.values(documentTypes)) {
        const fallback = (await getDocumentPolicies(school.id, tx))[type];
        assert.ok(canDownload("ALUNO", fallback) && canDownload("RESPONSAVEL", fallback));
        const permissions = { enabled: true, studentCanDownload: index === 0, guardianCanDownload: index === 1 };
        await saveDocumentPolicy(tx, actor, type, permissions);
        await saveDocumentPolicy(tx, actor, type, permissions);
        const policy = (await getDocumentPolicies(school.id, tx))[type];
        assert.equal(canDownload("ALUNO", policy), index === 0);
        assert.equal(canDownload("RESPONSAVEL", policy), index === 1);
        assert.equal(canDownload("PROFESSOR", policy), false);
        assert.ok(canDownload("ADMIN", { ...policy, enabled: false }));
        assert.equal(canDownload("ALUNO", { ...policy, enabled: false }), false);
        assert.equal(canDownload("RESPONSAVEL", { ...policy, enabled: false }), false);
        const record = await tx.documentPolicy.findUniqueOrThrow({ where: { schoolId_documentType: { schoolId: school.id, documentType: type } } });
        const logs = await tx.auditLog.findMany({ where: { schoolId: school.id, entityId: record.id } });
        assert.equal(logs.length, 1);
        assert.equal(logs[0].userId, user.id);
        assert.equal(logs[0].source, "ADMIN");
        assert.deepEqual(logs[0].before, fallback);
        assert.deepEqual(logs[0].after, permissions);
        assert.deepEqual(logs[0].metadata, { documentType: type });
        await assert.rejects(saveDocumentPolicy(tx, { ...actor, role: "RESPONSAVEL" }, type, permissions));
      }
    }
    const a = await getDocumentPolicies(schools[0].id, tx);
    const b = await getDocumentPolicies(schools[1].id, tx);
    for (const { type } of Object.values(documentTypes)) assert.notEqual(a[type].studentCanDownload, b[type].studentCanDownload);
    throw rollback;
  }, { timeout: 20000 }), error => error === rollback);
  console.log("Políticas dos três documentos, quatro perfis, duas escolas e auditoria validadas.");
}

validate().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
