import { buildStudentImportTemplateCsv } from "@/lib/student-import-csv";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession(["ADMIN"]);
  const csv = buildStudentImportTemplateCsv();

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao-alunos.csv"'
    }
  });
}
