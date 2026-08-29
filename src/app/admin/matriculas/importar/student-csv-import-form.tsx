"use client";

import type React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { confirmStudentCsvImport, validateStudentCsvImport } from "@/app/actions/academic";
import { AdminEmptyState, AdminSection } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  initialStudentCsvImportState,
  STUDENT_IMPORT_DATE_FORMAT,
  STUDENT_IMPORT_MAX_FILE_SIZE,
  type StudentCsvImportState
} from "@/lib/student-import-csv";

function SubmitButton({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Processando..." : children}
    </Button>
  );
}

function PreviewTable({ state }: { state: StudentCsvImportState }) {
  if (!state.rows.length) {
    return (
      <AdminEmptyState
        title="Nenhum arquivo validado"
        description="Envie o CSV para visualizar os alunos antes de confirmar a importação."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Linha</th>
            <th>Aluno</th>
            <th>Responsável</th>
            <th>Turma</th>
            <th>Ano letivo</th>
            <th>Data de entrada</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {state.rows.map((row) => (
            <tr key={row.line}>
              <td>{row.line}</td>
              <td className="font-medium text-school-navy">{row.studentName || "-"}</td>
              <td>{row.guardianName || row.guardianEmail || row.guardianCpf || "-"}</td>
              <td>{row.classroomName || "-"}</td>
              <td>{row.academicYear || "-"}</td>
              <td>{row.enrolledAt || "-"}</td>
              <td>
                {row.status === "valid" ? (
                  <Badge variant="success">Válida</Badge>
                ) : (
                  <div className="grid gap-1">
                    <Badge variant="warning">Revisar</Badge>
                    <span className="max-w-xs text-xs text-text-secondary">{row.errors.join(" ")}</span>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StudentCsvImportForm() {
  const [validationState, validateAction] = useActionState(validateStudentCsvImport, initialStudentCsvImportState);
  const [confirmationState, confirmAction] = useActionState(confirmStudentCsvImport, initialStudentCsvImportState);
  const canConfirm = validationState.status === "preview" && validationState.validRows > 0 && Boolean(validationState.payload);

  return (
    <div className="grid gap-4">
      <AdminSection
        title="Arquivo CSV"
        description="Valide a planilha antes de criar alunos, responsáveis e matrículas."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/matriculas/importar/modelo">
              <Download className="h-4 w-4" />
              Baixar modelo CSV
            </Link>
          </Button>
        }
      >
        <form action={validateAction} className="grid gap-4">
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-5">
            <label className="grid gap-2 text-sm font-medium text-school-navy">
              Arquivo de alunos
              <input
                type="file"
                name="csvFile"
                accept=".csv,text/csv"
                className="block w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-school-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              />
            </label>
            <p className="mt-2 text-xs text-text-muted">
              Use ponto e vírgula como separador. Datas no formato {STUDENT_IMPORT_DATE_FORMAT}. Tamanho máximo:{" "}
              {Math.round(STUDENT_IMPORT_MAX_FILE_SIZE / 1024)} KB.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {validationState.message ? (
              <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
                {validationState.status === "error" ? (
                  <AlertCircle className="h-4 w-4 text-warning" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
                {validationState.message}
              </p>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <FileSpreadsheet className="h-4 w-4 text-school-primary" />
                Nenhum dado será gravado nesta etapa.
              </p>
            )}
            <SubmitButton variant="secondary">Validar CSV</SubmitButton>
          </div>
        </form>
      </AdminSection>

      {confirmationState.status === "success" ? (
        <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          {confirmationState.message}
        </div>
      ) : null}

      <AdminSection
        title="Pré-visualização"
        description={`${validationState.validRows} de ${validationState.totalRows} linha${
          validationState.totalRows === 1 ? "" : "s"
        } válida${validationState.validRows === 1 ? "" : "s"}.`}
        action={
          canConfirm ? (
            <form action={confirmAction}>
              <input type="hidden" name="payload" value={validationState.payload} />
              <SubmitButton>Confirmar importação</SubmitButton>
            </form>
          ) : null
        }
      >
        <PreviewTable state={validationState} />
      </AdminSection>
    </div>
  );
}
