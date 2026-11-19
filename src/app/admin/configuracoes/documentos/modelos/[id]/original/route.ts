import { getSession } from "@/lib/auth";
import { adminTemplate } from "@/services/document-templates";
import { readOriginal } from "@/lib/document-templates/storage";
import { mime } from "@/lib/document-templates/docx";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getSession();
  if (!actor || actor.role !== "ADMIN") return new Response(null, { status: actor ? 403 : 401 });
  try {
    const row = await adminTemplate(actor, (await params).id);
    return new Response(new Uint8Array(await readOriginal(row)), {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Type": mime,
        "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(row.originalName)
      }
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
