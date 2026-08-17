import { Badge } from "@/components/ui/badge";
import { StudentPageHeader, StudentSection } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { studentEnrollmentStatusLabel, studentShiftLabel } from "@/lib/student-labels";
import { formatDate } from "@/lib/utils";
import { getStudentPortal } from "@/services/school-data";

export const dynamic = "force-dynamic";

function DataItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value || "-"}</p>
    </div>
  );
}

export default async function StudentProfilePage() {
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const enrollment = portal.enrollment;
  const classroom = enrollment?.classroom;

  return (
    <main className="page-shell">
      <StudentPageHeader
        title="Meu perfil"
        description="Dados pessoais, acadêmicos e responsáveis vinculados."
        eyebrow="Dados do aluno"
      />

      <StudentSection title="Dados pessoais">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <DataItem label="Nome completo" value={portal.student.fullName} />
          <DataItem label="CPF" value={portal.student.cpf} />
          <DataItem label="Data de nascimento" value={portal.student.birthDate ? formatDate(portal.student.birthDate) : null} />
          <DataItem label="E-mail" value={portal.student.email} />
          <DataItem label="Telefone" value={portal.student.phone} />
          <DataItem label="Endereço" value={portal.student.address} />
        </div>
      </StudentSection>

      <StudentSection title="Dados acadêmicos">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <DataItem label="Matrícula" value={enrollment?.registration} />
          <DataItem label="Turma" value={classroom?.name} />
          <DataItem label="Série" value={classroom?.gradeLevel} />
          <DataItem label="Turno" value={classroom ? studentShiftLabel(classroom.shift) : null} />
          <DataItem label="Ano letivo" value={enrollment?.academicYear.year} />
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Situação da matrícula</p>
            <div className="mt-1">
              <Badge variant="info">{enrollment ? studentEnrollmentStatusLabel(enrollment.status) : "-"}</Badge>
            </div>
          </div>
        </div>
      </StudentSection>

      <StudentSection title="Responsáveis">
        {portal.student.guardians.length ? (
          <div className="divide-y">
            {portal.student.guardians.map(({ guardian, isPrimary }) => (
              <div key={guardian.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-slate-950">{guardian.fullName}</p>
                  <p className="text-sm text-muted-foreground">{guardian.relation}</p>
                </div>
                {isPrimary ? <Badge variant="success">Principal</Badge> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum responsável vinculado.</p>
        )}
      </StudentSection>
    </main>
  );
}
