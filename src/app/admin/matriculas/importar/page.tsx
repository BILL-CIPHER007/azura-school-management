import Link from "next/link";
import { Upload } from "lucide-react";
import { StudentCsvImportForm } from "@/app/admin/matriculas/importar/student-csv-import-form";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ImportEnrollmentsPage() {
  await requireSession(["ADMIN"]);

  return (
    <main className="page-shell">
      <AdminPageHeader
        title="Importar alunos"
        description="Valide uma planilha CSV e confirme a criação das matrículas em lote."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Matrículas", href: "/admin/matriculas" },
          { label: "Importar alunos" }
        ]}
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/matriculas">Voltar</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/matriculas/nova">
                <Upload className="h-4 w-4" />
                Nova matrícula manual
              </Link>
            </Button>
          </>
        }
      />

      <StudentCsvImportForm />
    </main>
  );
}
