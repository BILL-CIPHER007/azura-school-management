import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { getTeacherDetails } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function TeacherDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const { id } = await params;
  const teacher = await getTeacherDetails(session.schoolId, id);
  if (!teacher) notFound();

  return (
    <main className="page-shell">
      <PageHeader title={teacher.fullName} description="Visualização individual do professor." />
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>E-mail</CardTitle>
          </CardHeader>
          <CardContent>{teacher.email}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Telefone</CardTitle>
          </CardHeader>
          <CardContent>{teacher.phone}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="success">{teacher.status}</Badge>
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Turmas e disciplinas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {teacher.assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-lg border p-4">
              <strong>{assignment.classroom.name}</strong>
              <p className="text-sm text-muted-foreground">{assignment.subject.name}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
