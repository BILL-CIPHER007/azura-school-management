import { GraduationCap, Mail, MapPin, Phone, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StudentPageHeader, StudentSection } from "@/components/student/student-ui";
import { requireSession } from "@/lib/auth";
import { studentEnrollmentStatusLabel, studentShiftLabel } from "@/lib/student-labels";
import { formatDate } from "@/lib/utils";
import { getStudentPortal } from "@/services/school-data";

export const dynamic = "force-dynamic";

function DataItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-school-navy">{value || "-"}</p>
    </div>
  );
}

export default async function StudentProfilePage() {
  const session = await requireSession(["ALUNO"]);
  const portal = await getStudentPortal(session.schoolId, session.id);
  const enrollment = portal.enrollment;
  const classroom = enrollment?.classroom;

  return (
    <main className="student-page">
      <StudentPageHeader
        title="Meu perfil"
        description="Dados pessoais, acadêmicos e responsáveis vinculados à sua matrícula."
        eyebrow="Dados do aluno"
      />

      <StudentSection title="Identificação">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={portal.student.fullName} className="h-20 w-20 text-xl" />
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-normal text-school-navy">{portal.student.fullName}</h2>
            <p className="mt-1 text-sm text-text-secondary">{classroom ? `${classroom.name} · ${classroom.gradeLevel}` : "Sem matrícula ativa"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="info">{enrollment ? studentEnrollmentStatusLabel(enrollment.status) : "Sem matrícula"}</Badge>
              {classroom ? <Badge variant="primary">{studentShiftLabel(classroom.shift)}</Badge> : null}
            </div>
          </div>
        </div>
      </StudentSection>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <StudentSection title="Dados pessoais">
          <div className="grid gap-4 md:grid-cols-2">
            <DataItem label="Nome completo" value={portal.student.fullName} />
            <DataItem label="CPF" value={portal.student.cpf} />
            <DataItem label="Data de nascimento" value={portal.student.birthDate ? formatDate(portal.student.birthDate) : null} />
            <DataItem label="E-mail" value={portal.student.email} />
            <DataItem label="Telefone" value={portal.student.phone} />
            <DataItem label="Endereço" value={portal.student.address} />
          </div>
        </StudentSection>

        <StudentSection title="Contato rápido">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-school-primary-soft p-3">
              <Mail className="h-4 w-4 text-school-primary" />
              <span className="text-sm text-school-navy">{portal.student.email || "E-mail não informado"}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-school-primary-soft p-3">
              <Phone className="h-4 w-4 text-school-primary" />
              <span className="text-sm text-school-navy">{portal.student.phone || "Telefone não informado"}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-school-primary-soft p-3">
              <MapPin className="h-4 w-4 text-school-primary" />
              <span className="text-sm text-school-navy">{portal.student.address || "Endereço não informado"}</span>
            </div>
          </div>
        </StudentSection>
      </section>

      <StudentSection title="Dados acadêmicos">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DataItem label="Matrícula" value={enrollment?.registration} />
          <DataItem label="Turma" value={classroom?.name} />
          <DataItem label="Série" value={classroom?.gradeLevel} />
          <DataItem label="Turno" value={classroom ? studentShiftLabel(classroom.shift) : null} />
          <DataItem label="Ano letivo" value={enrollment?.academicYear.year} />
          <div className="rounded-lg border border-border bg-surface-muted/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-text-muted">Situação da matrícula</p>
            <div className="mt-2">
              <Badge variant="info">{enrollment ? studentEnrollmentStatusLabel(enrollment.status) : "-"}</Badge>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted/60 p-4 md:col-span-2">
            <GraduationCap className="h-5 w-5 text-school-primary" />
            <p className="mt-2 text-sm font-semibold text-school-navy">Acompanhamento acadêmico</p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">As informações desta página são somente para consulta pelo aluno.</p>
          </div>
        </div>
      </StudentSection>

      <StudentSection title="Responsáveis">
        {portal.student.guardians.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {portal.student.guardians.map(({ guardian, isPrimary }) => (
              <div key={guardian.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/60 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-school-primary text-white">
                    <UsersRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-school-navy">{guardian.fullName}</p>
                    <p className="text-sm text-text-secondary">{guardian.relation}</p>
                  </div>
                </div>
                {isPrimary ? <Badge variant="success">Principal</Badge> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Nenhum responsável vinculado.</p>
        )}
      </StudentSection>
    </main>
  );
}
