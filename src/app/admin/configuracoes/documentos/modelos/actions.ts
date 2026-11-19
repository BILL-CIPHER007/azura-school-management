"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { check, TemplateError } from "@/lib/document-template-placeholders";
import { changeTemplate, uploadTemplate } from "@/services/document-templates";
const path = "/admin/configuracoes/documentos/modelos";
export async function manage(form: FormData) {
  const actor = await requireSession(["ADMIN"]);
  let query = "?ok=1";
  try {
    const event = form.get("event");
    if (event === "upload") {
      const file = form.get("file");
      check(file && typeof file !== "string", "Selecione um DOCX.");
      await uploadTemplate(actor, String(form.get("type") ?? ""), String(form.get("name") ?? ""), file);
    } else {
      check(event === "activate" || event === "archive" || event === "restore", "Ação inválida.");
      check(form.get("confirm") === "on", "Confirme a alteração do modelo.");
      await changeTemplate(actor, String(form.get("id")), event);
    }
  } catch (e) {
    query =
      "?erro=" +
      encodeURIComponent(
        e instanceof TemplateError
          ? e.message
          : "Não foi possível salvar o modelo. Confira o storage e tente novamente."
      );
  }
  revalidatePath(path);
  redirect(path + query);
}
