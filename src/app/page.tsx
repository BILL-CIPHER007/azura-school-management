import type { UserRole } from "@prisma/client";
import { BookOpen, GraduationCap, ShieldCheck, UsersRound } from "lucide-react";
import { loginDemo } from "@/app/actions/auth";
import { DemoBadge, SchoolBrand } from "@/components/school-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { schoolConfig } from "@/config/school";

const demoProfiles: Array<{
  role: UserRole;
  title: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  {
    role: "ADMIN",
    title: "Entrar como Administrador",
    description: "Secretaria, matriculas, turmas e comunicados.",
    icon: ShieldCheck
  },
  {
    role: "PROFESSOR",
    title: "Entrar como Professor",
    description: "Chamada, notas e acompanhamento das turmas.",
    icon: BookOpen
  },
  {
    role: "ALUNO",
    title: "Entrar como Aluno",
    description: "Boletim, frequencia e calendario escolar.",
    icon: GraduationCap
  },
  {
    role: "RESPONSAVEL",
    title: "Entrar como Responsavel",
    description: "Acompanhe filhos, notas e frequencia.",
    icon: UsersRound
  }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_520px] lg:px-8">
        <div className="max-w-2xl">
          <SchoolBrand className="text-sm text-muted-foreground" />
          <div className="mt-5">
            <DemoBadge />
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            {schoolConfig.landingTitle}
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">{schoolConfig.landingSubtitle}</p>

          {schoolConfig.demo.isDemo && schoolConfig.demo.showDemoMetrics ? (
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {schoolConfig.demo.metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border bg-card p-4">
                  <strong className="text-2xl">{metric.value}</strong>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {schoolConfig.demo.isDemo && schoolConfig.demo.quickAccessEnabled ? (
          <Card>
            <CardHeader>
              <CardTitle>Acessos rapidos da apresentacao</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {demoProfiles.map((profile) => {
                const Icon = profile.icon;
                return (
                  <form action={loginDemo} key={profile.role}>
                    <input type="hidden" name="role" value={profile.role} />
                    <Button
                      className="h-auto w-full justify-start gap-3 p-4 text-left"
                      variant="outline"
                      type="submit"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span>
                        <span className="block font-semibold">{profile.title}</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {profile.description}
                        </span>
                      </span>
                    </Button>
                  </form>
                );
              })}
              <p className="pt-2 text-xs text-muted-foreground">
                Usuarios e senha sao dados ficticios de desenvolvimento gerados pelo seed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Acesso ao portal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use as credenciais fornecidas pela escola para acessar sua area no portal.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
