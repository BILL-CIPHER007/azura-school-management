import { PageHeader, ProgressBar } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, gradeSituation } from "@/lib/utils";
import type { summarizeEnrollment } from "@/services/school-data";

type Summary = ReturnType<typeof summarizeEnrollment>;

export function StudentSummaryCards({
  averageGrade,
  attendanceRate,
  absences,
  classroom
}: Summary & { classroom?: string }) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Minha média</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{averageGrade.toFixed(1)}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Minha frequência</CardTitle>
        </CardHeader>
        <CardContent>
          <strong className="text-3xl">{formatPercent(attendanceRate)}</strong>
          <ProgressBar value={attendanceRate} className="mt-2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Minha turma</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{classroom ?? "-"}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Faltas</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{absences}</CardContent>
      </Card>
    </section>
  );
}

export function SubjectBars({ subjects }: { subjects: Summary["subjectAverages"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho acadêmico</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {subjects.map((subject) => (
          <div key={subject.subject} className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span>{subject.subject}</span>
              <strong>{subject.average.toFixed(1)}</strong>
            </div>
            <ProgressBar value={subject.average * 10} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ReportTable({
  grades,
  attendanceRate
}: {
  grades: Array<{ subject: { name: string }; academicPeriod: { sortOrder: number; name: string }; average: number }>;
  attendanceRate: number;
}) {
  const subjects = [...new Set(grades.map((grade) => grade.subject.name))];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Boletim</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Disciplina</th>
                <th>1º Bimestre</th>
                <th>2º Bimestre</th>
                <th>3º Bimestre</th>
                <th>4º Bimestre</th>
                <th>Média</th>
                <th>Frequência</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => {
                const subjectGrades = grades.filter((grade) => grade.subject.name === subject);
                const values = [1, 2, 3, 4].map(
                  (period) =>
                    subjectGrades.find((grade) => grade.academicPeriod.sortOrder === period)?.average ?? 0
                );
                const subjectAverage =
                  values.filter(Boolean).reduce((sum, value) => sum + value, 0) /
                  Math.max(1, values.filter(Boolean).length);
                const situation = gradeSituation(subjectAverage, attendanceRate);
                return (
                  <tr key={subject}>
                    <td className="font-medium">{subject}</td>
                    {values.map((value, index) => (
                      <td key={index}>{value ? value.toFixed(1) : "-"}</td>
                    ))}
                    <td>{subjectAverage.toFixed(1)}</td>
                    <td>{formatPercent(attendanceRate)}</td>
                    <td>
                      <Badge variant={situation === "Aprovado" ? "success" : "warning"}>
                        {situation}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PortalHeader({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return <PageHeader title={title} description={description} />;
}
