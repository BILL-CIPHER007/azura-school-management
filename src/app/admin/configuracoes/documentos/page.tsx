import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { documentTypes, getDocumentPolicies, isDocumentType, saveDocumentPolicy } from "@/lib/document-policy";
import { prisma } from "@/lib/prisma";

const path = "/admin/configuracoes/documentos";

async function save(form: FormData) {
  "use server";
  const actor = await requireSession(["ADMIN"]);
  const slug = form.get("document");
  if (typeof slug !== "string" || !isDocumentType(slug)) throw new Error("Documento inválido.");
  await prisma.$transaction(tx => saveDocumentPolicy(tx, actor, documentTypes[slug].type, {
    enabled: form.has("enabled"),
    studentCanDownload: form.has("student"),
    guardianCanDownload: form.has("guardian")
  }));
  revalidatePath(path);
  redirect(path + "?salvo=" + slug);
}

export default async function DocumentSettings({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const policies = await getDocumentPolicies(session.schoolId);
  const { salvo } = await searchParams;
  return (
    <main className="space-y-4">
      <AdminPageHeader title="Documentos" breadcrumbs={[
        { label: "Configurações", href: "/admin/configuracoes" }, { label: "Documentos" }
      ]} action={<Button asChild variant="secondary"><Link href="/admin/configuracoes/documentos/modelos">Modelos</Link></Button>} />
      <AdminSection title="Permissões de download" description="O administrador da escola continua podendo emitir os documentos independentemente desta configuração.">
        {salvo && isDocumentType(salvo) && (
          <p role="status" className="mb-4 text-sm text-success">Permissões salvas para {documentTypes[salvo].label.toLocaleLowerCase("pt-BR")}.</p>
        )}
        <div className="divide-y divide-border">
          {Object.entries(documentTypes).map(([slug, { type, label }]) => (
            <form key={slug} action={save} aria-label={label} className="py-4">
              <input type="hidden" name="document" value={slug} />
              <fieldset>
                <legend className="font-semibold">{label}</legend>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                  {([
                    ["enabled", "Habilitar autoatendimento", policies[type].enabled],
                    ["student", "Permitir download pelo aluno", policies[type].studentCanDownload],
                    ["guardian", "Permitir download pelo responsável", policies[type].guardianCanDownload]
                  ] as const).map(([name, text, checked]) => (
                    <label key={name} className="inline-flex items-center gap-2">
                      <input type="checkbox" role="switch" name={name} defaultChecked={checked} className="size-4 accent-school-primary" />
                      {text}
                    </label>
                  ))}
                  <Button type="submit" size="sm" aria-label={`Salvar permissões de ${label}`}>Salvar</Button>
                </div>
              </fieldset>
            </form>
          ))}
        </div>
      </AdminSection>
    </main>
  );
}
