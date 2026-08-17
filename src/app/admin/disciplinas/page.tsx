import { createSubject } from "@/app/actions/academic";
import { PageHeader } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth";
import { listSubjects } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const session = await requireSession(["ADMIN"]);
  const subjects = await listSubjects(session.schoolId);

  return (
    <main className="page-shell">
      <PageHeader title="Disciplinas" description="Base curricular configurável por escola." />
      <form action={createSubject} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_160px_auto]">
        <Input name="name" placeholder="Nova disciplina" required />
        <Input name="code" placeholder="Código" required />
        <Button type="submit">Cadastrar</Button>
      </form>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => (
          <Card key={subject.id}>
            <CardHeader>
              <CardTitle>{subject.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {subject.assignments.length} vínculos com professores e turmas
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
