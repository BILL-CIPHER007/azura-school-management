import { Download, Eye, Upload } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { placeholders, templateLabels, isTemplateType } from "@/lib/document-template-placeholders";
import { manage } from "./actions";
import { RefreshAfterPreview } from "./refresh";

const root = "/admin/configuracoes/documentos";
const slugs = {
  DECLARACAO_MATRICULA: "declaracao-matricula",
  HISTORICO_ESCOLAR: "historico",
  BOLETIM: "boletim",
  RECIBO: "recibo"
};
const field = "rounded-md border border-border bg-surface px-2 py-2 text-sm";
export default async function Templates({
  searchParams
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const actor = await requireSession(["ADMIN"]);
  const schoolId = actor.schoolId;
  const school = await prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { plan: true } });
  const types = Object.keys(templateLabels)
    .filter(isTemplateType)
    .filter((t) => t !== "RECIBO" || school.plan === "PROFISSIONAL");
  const [models, students, charges, query] = await Promise.all([
    prisma.documentTemplate.findMany({
      where: { schoolId, type: { in: types } },
      orderBy: { version: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        name: true,
        version: true,
        previewedAt: true,
        placeholders: true
      }
    }),
    prisma.student.findMany({
      where: { schoolId },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" }
    }),
    school.plan === "PROFISSIONAL"
      ? prisma.charge.findMany({
          where: { schoolId, status: "PAID", paidAt: { not: null }, refundedAt: null },
          select: { id: true, reference: true, student: { select: { fullName: true } } },
          orderBy: { paidAt: "desc" }
        })
      : [],
    searchParams
  ]);
  return (
    <main className="space-y-4">
      <RefreshAfterPreview />
      <AdminPageHeader
        title="Modelos de documentos"
        breadcrumbs={[
          { label: "Configurações", href: "/admin/configuracoes" },
          { label: "Documentos", href: root },
          { label: "Modelos" }
        ]}
      />
      {query.erro ? (
        <p role="alert" className="text-sm text-danger">
          {query.erro.slice(0, 300)}
        </p>
      ) : query.ok ? (
        <p role="status" className="text-sm text-success">
          Alteração salva.
        </p>
      ) : null}
      <AdminSection title="Novo rascunho">
        <form action={manage} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="event" value="upload" />
          <label className="grid gap-1">
            Tipo
            <select className={field} name="type">
              {types.map((t) => (
                <option key={t} value={t}>
                  {templateLabels[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            Nome do modelo
            <input className={field} name="name" maxLength={100} required />
          </label>
          <label className="grid min-w-0 gap-1">
            Arquivo DOCX (até 1 MB)
            <input className={field + " max-w-full"} name="file" type="file" accept=".docx" required />
          </label>
          <Button type="submit">
            <Upload size={15} />
            Enviar rascunho
          </Button>
        </form>
      </AdminSection>
      {types.map((type) => {
        const rows = models.filter((m) => m.type === type);
        const active = rows.find((m) => m.status === "ACTIVE");
        return (
          <AdminSection
            key={type}
            title={templateLabels[type]}
            description={
              active ? "Personalizado ativo: " + active.name + " · v" + active.version : "Padrão Azura"
            }
          >
            <details className="mb-3 text-sm">
              <summary className="cursor-pointer font-medium">Campos disponíveis</summary>
              <dl className="mt-2 grid gap-1">
                {Object.entries(placeholders[type]).map(([key, label]) => (
                  <div key={key} className="flex flex-wrap gap-2">
                    <dt>
                      <code>{"{{" + key + "}}"}</code>
                    </dt>
                    <dd>{label}</dd>
                  </div>
                ))}
              </dl>
            </details>
            {rows.map((m) => (
              <div key={m.id} className="space-y-2 border-t border-border py-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <strong className="break-all">
                    {m.name} · v{m.version}
                  </strong>
                  <span>
                    {{ ACTIVE: "Personalizado ativo", DRAFT: "Rascunho", ARCHIVED: "Arquivado" }[m.status]}
                  </span>
                  <a
                    className="inline-flex items-center gap-1 text-school-primary"
                    href={root + "/modelos/" + m.id + "/original"}
                  >
                    <Download size={14} />
                    Original DOCX
                  </a>
                </div>
                <p className="break-words text-text-muted">
                  Campos reconhecidos: {m.placeholders.map((k) => "{{" + k + "}}").join(", ") || "nenhum"}
                </p>
                {m.status === "DRAFT" && (
                  <form
                    method="get"
                    target="_blank"
                    action={"/api/documentos/" + slugs[type]}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="modelo" value={m.id} />
                    <label className="grid gap-1">
                      {type === "RECIBO" ? "Cobrança paga" : "Aluno da prévia"}
                      <select
                        className={field + " max-w-full"}
                        name={type === "RECIBO" ? "chargeId" : "studentId"}
                        required
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Selecione
                        </option>
                        {type === "RECIBO"
                          ? charges.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.student.fullName} · {c.reference}
                              </option>
                            ))
                          : students.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.fullName}
                              </option>
                            ))}
                      </select>
                    </label>
                    <Button type="submit" variant="secondary" size="sm">
                      <Eye size={14} />
                      Prévia PDF
                    </Button>
                  </form>
                )}
                {m.status !== "ARCHIVED" && (
                  <form action={manage} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={m.id} />
                    <label className="flex items-center gap-1">
                      <input type="checkbox" required name="confirm" />
                      Confirmo a alteração desta versão
                    </label>
                    {m.status === "ACTIVE" ? (
                      <Button type="submit" name="event" value="restore" size="sm" variant="secondary">
                        Restaurar padrão Azura
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="submit"
                          name="event"
                          value="activate"
                          size="sm"
                          disabled={!m.previewedAt}
                        >
                          Ativar modelo
                        </Button>
                        <Button type="submit" name="event" value="archive" size="sm" variant="secondary">
                          Arquivar
                        </Button>
                      </>
                    )}
                  </form>
                )}
              </div>
            ))}
          </AdminSection>
        );
      })}
    </main>
  );
}
