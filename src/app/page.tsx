import type { UserRole } from "@prisma/client";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  School,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { loginDemo } from "@/app/actions/auth";
import { SchoolBrand } from "@/components/school-brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { schoolConfig } from "@/config/school";
import { cn } from "@/lib/utils";

const profileAccess: Array<{
  role: UserRole;
  title: string;
  eyebrow: string;
  description: string;
  cta: string;
  icon: typeof ShieldCheck;
}> = [
  {
    role: "ADMIN",
    title: "Administrador",
    eyebrow: "Gestão institucional",
    description: "Controle matrículas, turmas, calendário, comunicados e relatórios em uma visão organizada.",
    cta: "Área do administrador",
    icon: ShieldCheck
  },
  {
    role: "PROFESSOR",
    title: "Professor",
    eyebrow: "Rotina pedagógica",
    description: "Acesse turmas, chamadas, notas e comunicados com foco nas ações do dia a dia.",
    cta: "Área do professor",
    icon: BookOpenCheck
  },
  {
    role: "ALUNO",
    title: "Aluno",
    eyebrow: "Acompanhamento acadêmico",
    description: "Consulte boletim, frequência, calendário e avisos importantes em um portal simples.",
    cta: "Área do aluno",
    icon: GraduationCap
  },
  {
    role: "RESPONSAVEL",
    title: "Responsável",
    eyebrow: "Apoio familiar",
    description: "Acompanhe desempenho, frequência, eventos e comunicados dos alunos vinculados.",
    cta: "Área do responsável",
    icon: UsersRound
  }
];

const features = [
  {
    title: "Gestão acadêmica",
    description: "Organize matrículas, turmas, disciplinas, professores e vínculos com clareza operacional.",
    icon: School
  },
  {
    title: "Acompanhamento de desempenho",
    description: "Notas, médias, frequência e situações acadêmicas centralizadas para decisões mais rápidas.",
    icon: BarChart3
  },
  {
    title: "Comunicação escolar",
    description: "Comunicados por público e contexto certo, conectando escola, docentes, alunos e famílias.",
    icon: MessageSquareText
  },
  {
    title: "Calendário e rotina",
    description: "Eventos, prazos e compromissos escolares apresentados de forma simples e consistente.",
    icon: CalendarDays
  }
];

const differentiators = [
  { label: "Fácil de usar", icon: CheckCircle2 },
  { label: "Seguro e confiável", icon: LockKeyhole },
  { label: "Gestão integrada", icon: LayoutDashboard }
];

const institutionalHighlights = [
  { value: "4", label: "perfis integrados" },
  { value: "1", label: "gestão centralizada" },
  { value: "Rotina", label: "conectada" }
];

const demoErrorMessages: Record<string, string> = {
  demo: "O acesso rápido está desativado nesta instalação.",
  perfil: "O perfil selecionado não está disponível.",
  seed: "Os usuários configurados não foram encontrados. Verifique os dados iniciais do sistema.",
  senha: "A senha configurada não confere com os usuários do banco."
};

function ProfileAccessForm({ role, cta }: { role: UserRole; cta: string }) {
  return (
    <form action={loginDemo}>
      <input type="hidden" name="role" value={role} />
      <Button type="submit" variant="outline" className="mt-5 w-full justify-between">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

function ProductPreview() {
  const rows = [
    { subject: "Língua Portuguesa", value: "8,7", tone: "bg-success" },
    { subject: "Matemática", value: "7,9", tone: "bg-school-primary" },
    { subject: "Ciências", value: "8,4", tone: "bg-info" }
  ];

  return (
    <div className="relative">
      <div className="absolute -right-8 top-10 hidden h-48 w-48 rounded-full border border-school-primary/10 lg:block" />
      <div className="relative overflow-hidden rounded-lg border border-border bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-school-primary text-white">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-school-navy">Painel escolar</p>
              <p className="text-xs text-text-muted">Ano letivo {schoolConfig.academic.academicYear}</p>
            </div>
          </div>
          <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
            Em dia
          </span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-background p-4">
            <p className="text-xs font-medium uppercase text-text-muted">Média geral</p>
            <div className="mt-2 flex items-end justify-between">
              <strong className="text-4xl text-school-navy">8,4</strong>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            <p className="text-xs font-medium uppercase text-text-muted">Frequência</p>
            <div className="mt-2 flex items-end justify-between">
              <strong className="text-4xl text-school-navy">94%</strong>
              <CalendarDays className="mb-1 h-6 w-6 text-school-primary" />
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-md border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-semibold text-school-navy">Desempenho por disciplina</p>
              <BarChart3 className="h-4 w-4 text-school-primary" />
            </div>
            <div className="space-y-4 p-4">
              {rows.map((row) => (
                <div key={row.subject}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">{row.subject}</span>
                    <span className="font-semibold text-school-navy">{row.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-border">
                    <div
                      className={cn("h-2 rounded-full", row.tone)}
                      style={{ width: `${Number(row.value.replace(",", ".")) * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border bg-school-primary-soft p-4">
            <div className="flex items-center gap-2 text-school-primary">
              <BellRing className="h-5 w-5" />
              <p className="font-semibold">Próximos eventos</p>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-md bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase text-text-muted">27 ago</p>
                <p className="mt-1 text-sm font-semibold text-school-navy">Reunião pedagógica</p>
              </div>
              <div className="rounded-md bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase text-text-muted">12 set</p>
                <p className="mt-1 text-sm font-semibold text-school-navy">Feira de Ciências</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ erro?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const demoError = params.erro ? demoErrorMessages[params.erro] ?? "Não foi possível iniciar o acesso." : null;
  const showQuickAccess = schoolConfig.demo.isDemo && schoolConfig.demo.quickAccessEnabled;
  const showEnvironmentNote = schoolConfig.demo.isDemo;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-white/92 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <SchoolBrand href="/" className="text-base text-text-primary" />
          <nav aria-label="Navegação principal" className="hidden items-center gap-7 text-sm font-medium text-text-secondary lg:flex">
            <Link href="#recursos" className="transition hover:text-school-primary">
              Recursos
            </Link>
            <Link href="#perfis" className="transition hover:text-school-primary">
              Perfis
            </Link>
            <Link href="#sobre" className="transition hover:text-school-primary">
              Sobre
            </Link>
            <Link href="#contato" className="transition hover:text-school-primary">
              Contato
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {showEnvironmentNote ? (
              <span className="hidden rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-text-muted/75 sm:inline">
                Demonstração
              </span>
            ) : null}
            <Button asChild>
              <a href="#perfis">
                Acessar portal
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div className="absolute inset-x-0 top-0 h-24 bg-white" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[minmax(0,0.92fr)_minmax(460px,1fr)] lg:px-8 lg:py-20">
          <div className="relative z-10 max-w-3xl">
            <Badge variant="info" className="mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Plataforma completa de gestão escolar
            </Badge>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-school-navy sm:text-5xl lg:text-6xl">
              Gestão escolar completa para uma rotina mais simples
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary sm:text-xl">
              Administração, professores, alunos e responsáveis conectados em uma única plataforma para organizar a
              rotina acadêmica e fortalecer o acompanhamento escolar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="#recursos">
                  Conhecer a plataforma
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#perfis">Acessar portal</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {differentiators.map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary"
                  >
                    <Icon className="h-4 w-4 text-school-primary" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section id="recursos" className="bg-background py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="neutral">Recursos</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-school-navy sm:text-4xl">
              Tudo o que sua escola precisa em um só lugar
            </h2>
            <p className="mt-4 text-lg leading-8 text-text-secondary">
              Uma base integrada para simplificar processos, acompanhar resultados e manter toda a comunidade escolar
              bem informada.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-lg border border-border bg-surface p-6 shadow-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-school-primary text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-school-navy">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="perfis" className="border-y border-border bg-surface py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <Badge variant="info">Acessos por perfil</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-normal text-school-navy sm:text-4xl">
                Cada pessoa na área certa do portal
              </h2>
              <p className="mt-4 text-lg leading-8 text-text-secondary">
                Perfis separados ajudam a proteger dados, reduzir ruído e entregar a rotina certa para cada usuário.
              </p>
            </div>
            {showEnvironmentNote ? (
              <p className="max-w-sm text-sm leading-6 text-text-muted">
                Ambiente preparado para apresentação. Os acessos rápidos usam os perfis configurados nesta instalação.
              </p>
            ) : null}
          </div>

          {demoError ? (
            <div
              role="alert"
              className="mt-8 rounded-lg border border-warning/25 bg-warning-soft p-4 text-sm text-school-navy"
            >
              <p className="font-semibold">Não foi possível iniciar o acesso</p>
              <p className="mt-1 leading-6 text-text-secondary">{demoError}</p>
            </div>
          ) : null}

          {showQuickAccess ? (
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {profileAccess.map((profile) => {
                const Icon = profile.icon;
                return (
                  <article key={profile.role} className="flex h-full flex-col rounded-lg border border-border bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-school-primary-soft text-school-primary">
                        <Icon className="h-6 w-6" />
                      </span>
                      <ArrowRight className="h-5 w-5 text-text-muted" />
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase text-text-muted">{profile.eyebrow}</p>
                    <h3 className="mt-2 text-xl font-semibold text-school-navy">{profile.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-text-secondary">{profile.description}</p>
                    <ProfileAccessForm role={profile.role} cta={profile.cta} />
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 rounded-lg border border-border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-school-navy">Acesso ao portal</h3>
              <p className="mt-2 text-text-secondary">Use as credenciais fornecidas pela escola para entrar na sua área.</p>
            </div>
          )}
        </div>
      </section>

      <section id="sobre" className="bg-background py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <Badge variant="neutral">Institucional</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-school-navy sm:text-4xl">
              Uma plataforma preparada para a rotina da sua escola
            </h2>
            <p className="mt-5 text-lg leading-8 text-text-secondary">
              A {schoolConfig.shortName} centraliza informações essenciais para melhorar organização, clareza,
              integração entre equipes e acompanhamento acadêmico ao longo do ano letivo.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {institutionalHighlights.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border bg-surface p-6 shadow-sm">
                <strong className="block text-4xl font-semibold text-school-primary">{metric.value}</strong>
                <span className="mt-2 block text-sm font-medium text-text-secondary">{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer id="contato" className="border-t border-border bg-school-navy text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <SchoolBrand className="text-white" />
            <p className="mt-2 text-sm font-medium text-white/72">{schoolConfig.descriptor}</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/72">
              {schoolConfig.description} Uma experiência integrada para gestão, comunicação e acompanhamento escolar.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Recursos</h3>
            <div className="mt-4 space-y-3 text-sm text-white/72">
              <a className="block hover:text-white" href="#recursos">
                Gestão acadêmica
              </a>
              <a className="block hover:text-white" href="#recursos">
                Comunicação escolar
              </a>
              <a className="block hover:text-white" href="#recursos">
                Calendário
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Perfis</h3>
            <div className="mt-4 space-y-3 text-sm text-white/72">
              <a className="block hover:text-white" href="#perfis">
                Administrador
              </a>
              <a className="block hover:text-white" href="#perfis">
                Professor
              </a>
              <a className="block hover:text-white" href="#perfis">
                Aluno
              </a>
              <a className="block hover:text-white" href="#perfis">
                Responsável
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Contato</h3>
            <div className="mt-4 space-y-3 text-sm text-white/72">
              <p>Suporte da secretaria</p>
              <p>Portal institucional</p>
              <p>Atendimento escolar</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/12">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {schoolConfig.academic.academicYear} {schoolConfig.name}. Todos os direitos reservados.</p>
            <p>Suporte · Segurança · Privacidade</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
