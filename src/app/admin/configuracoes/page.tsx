import { PageHeader } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getSchoolSettings } from "@/services/school-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession(["ADMIN"]);
  const settings = await getSchoolSettings(session.schoolId);

  return (
    <main className="page-shell">
      <PageHeader title="Configurações" description="Estrutura da escola, ano letivo, períodos e auditoria básica." />
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Escola</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Nome:</strong> {settings.school.name}</p>
            <p><strong>Slug:</strong> {settings.school.slug}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ano letivo e períodos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {settings.periods.map((period) => (
              <div key={period.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{period.academicYear.year} · {period.name}</span>
                <Badge>{formatDate(period.startsAt)} até {formatDate(period.endsAt)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Auditoria básica</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {settings.auditLogs.map((log) => (
            <div key={log.id} className="rounded-md border p-3 text-sm">
              <strong>{log.action}</strong> · {log.entity} · {formatDate(log.createdAt)}
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
