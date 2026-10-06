import type { UserRole } from "@prisma/client";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Database,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  School,
  ShieldCheck,
  Sparkles,
  UserCheck,
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
    description: "Controle matrículas, turmas, relatórios, financeiro e configurações em uma visão organizada.",
    cta: "Área do administrador",
    icon: ShieldCheck
  },
  {
    role: "PROFESSOR",
    title: "Professor",
    eyebrow: "Rotina pedagógica",
    description: "Acesse turmas, chamadas, notas, diário de classe e comunicados com foco no dia a dia.",
    cta: "Área do professor",
    icon: BookOpenCheck
  },
  {
    role: "ALUNO",
    title: "Aluno",
    eyebrow: "Acompanhamento acadêmico",
    description: "Consulte boletim, frequência, histórico, calendário e avisos importantes em um portal simples.",
    cta: "Área do aluno",
    icon: GraduationCap
  },
  {
    role: "RESPONSAVEL",
    title: "Responsável",
    eyebrow: "Apoio familiar",
    description: "Acompanhe desempenho, frequência, comunicados e, no Profissional, a rotina financeira vinculada.",
    cta: "Área do responsável",
    icon: UsersRound
  }
];

const featureGroups = [
  {
    title: "Gestão acadêmica",
    description: "Base operacional para organizar a rotina escolar de ponta a ponta.",
    icon: School,
    items: [
      "Alunos, responsáveis e matrículas",
      "Professores, turmas e disciplinas",
      "Notas, boletins e frequência",
      "Diário de classe e histórico escolar",
      "Calendário, comunicados e relatórios",
      "Documentos em PDF e importação CSV"
    ]
  },
  {
    title: "Acompanhamento escolar",
    description: "Portais separados para que cada pessoa veja o contexto certo.",
    icon: BarChart3,
    items: [
      "Portal do aluno",
      "Portal do responsável",
      "Desempenho acadêmico",
      "Frequência e ausências",
      "Eventos e comunicados",
      "Histórico e documentos"
    ]
  },
  {
    title: "Financeiro no Profissional",
    description: "Cobranças, conciliação e acompanhamento financeiro integrados ao contexto escolar.",
    icon: CreditCard,
    items: [
      "Cobranças e mensalidades recorrentes",
      "Geração em lote",
      "Pix e boleto",
      "Conciliação financeira",
      "Inadimplência e promessa de pagamento",
      "Comunicação financeira assistida"
    ]
  },
  {
    title: "Rastreabilidade",
    description: "Acompanhe alterações relevantes com mais clareza administrativa.",
    icon: ClipboardCheck,
    items: [
      "Usuário responsável",
      "Entidade afetada",
      "Data e hora",
      "Valores anteriores e novos quando aplicável",
      "Ações acadêmicas",
      "Ações administrativas e financeiras"
    ]
  }
];

const differentiators = [
  { label: "Interface simples", icon: CheckCircle2 },
  { label: "Isolamento por escola", icon: LockKeyhole },
  { label: "Plano e capacidade independentes", icon: LayoutDashboard }
];

const pricingPlans = [
  {
    name: "Essencial",
    description: "Gestão acadêmica completa para escolas que querem centralizar sua rotina em uma única plataforma.",
    badge: "Acadêmico",
    featured: false,
    training: "1 hora de treinamento de implantação",
    features: [
      "Gestão de alunos, responsáveis e matrículas",
      "Professores, turmas e disciplinas",
      "Notas, boletins e frequência",
      "Diário de classe",
      "Calendário e comunicados",
      "Portais do professor, aluno e responsável",
      "Histórico escolar e documentos em PDF",
      "Importação CSV e relatórios acadêmicos",
      "Trilha de auditoria de alterações relevantes",
      "Hospedagem, SSL, atualizações e suporte padrão"
    ],
    tiers: [
      { capacity: "Até 200 alunos ativos", monthly: "R$ 490/mês", setup: "R$ 1.500" },
      { capacity: "Até 300 alunos ativos", monthly: "R$ 590/mês", setup: "R$ 1.800" },
      { capacity: "Até 500 alunos ativos", monthly: "R$ 690/mês", setup: "R$ 2.200" },
      { capacity: "Acima de 500", monthly: "Proposta personalizada", setup: "Proposta personalizada" }
    ]
  },
  {
    name: "Profissional",
    description:
      "Gestão acadêmica e financeira integrada para escolas que querem centralizar também cobranças, mensalidades e acompanhamento financeiro.",
    badge: "Mais completo",
    featured: true,
    training: "2 horas de treinamento de implantação",
    features: [
      "Tudo do Essencial",
      "Gestão financeira integrada",
      "Mensalidades recorrentes",
      "Geração controlada de cobranças",
      "Pix, boleto e integração de pagamentos",
      "Conciliação financeira",
      "Controle de inadimplência e régua de cobrança",
      "Promessas de pagamento e histórico de contatos",
      "Envio assistido por e-mail",
      "Relatórios e histórico financeiro detalhado"
    ],
    tiers: [
      { capacity: "Até 200 alunos ativos", monthly: "R$ 790/mês", setup: "R$ 2.500" },
      { capacity: "Até 300 alunos ativos", monthly: "R$ 890/mês", setup: "R$ 2.900" },
      { capacity: "Até 500 alunos ativos", monthly: "R$ 990/mês", setup: "R$ 3.500" },
      { capacity: "Acima de 500", monthly: "Proposta personalizada", setup: "Proposta personalizada" }
    ]
  }
];

const securityItems = [
  {
    title: "Infraestrutura principal no Brasil",
    description: "Banco de dados e backend principal hospedados em São Paulo, Brasil.",
    icon: MapPin
  },
  {
    title: "Isolamento por escola",
    description: "Cada instituição acessa apenas seus próprios dados, com separação por escola e controle por perfil.",
    icon: Database
  },
  {
    title: "Controle por perfil",
    description: "Administradores, professores, alunos e responsáveis acessam apenas recursos compatíveis com suas permissões.",
    icon: UserCheck
  },
  {
    title: "Trilha de auditoria",
    description: "Alterações relevantes podem ser rastreadas por usuário, entidade, data e valores anteriores e novos quando aplicável.",
    icon: ShieldCheck
  },
  {
    title: "Privacidade",
    description: "A plataforma minimiza acessos desnecessários e protege informações acadêmicas, cadastrais e financeiras.",
    icon: LockKeyhole
  },
  {
    title: "Princípios da LGPD",
    description: "A Azura adota práticas alinhadas à minimização, controle de acesso e finalidade no tratamento de dados pessoais.",
    icon: FileText
  }
];

const implementationSteps = [
  "Configuração da escola",
  "Identidade visual",
  "Ano letivo e períodos",
  "Turmas e disciplinas",
  "Importação ou cadastro inicial",
  "Treinamento",
  "Validação dos perfis",
  "Liberação para operação"
];

const faqs = [
  {
    question: "Qual a diferença entre Essencial e Profissional?",
    answer: "O Essencial concentra a gestão acadêmica. O Profissional inclui também a gestão financeira integrada."
  },
  {
    question: "O número de alunos muda os recursos do plano?",
    answer: "Não. A capacidade contratada define o porte atendido. Os recursos dependem do plano funcional escolhido."
  },
  {
    question: "Minha escola tem 350 alunos e não quer financeiro. Posso usar o Essencial?",
    answer: "Sim. O Essencial está disponível nas faixas de até 200, 300 e 500 alunos ativos."
  },
  {
    question: "Uma escola pequena pode contratar o Profissional?",
    answer: "Sim. O Profissional pode ser contratado independentemente do porte da escola."
  },
  {
    question: "Pix e boleto têm tarifa?",
    answer:
      "Tarifas dos meios de pagamento são cobradas pelo respectivo provedor e não estão incluídas na mensalidade da Azura."
  },
  {
    question: "Os dados ficam no Brasil?",
    answer:
      "O banco de dados e o backend principal da Azura estão configurados em São Paulo, Brasil. Serviços externos possuem infraestrutura própria."
  },
  {
    question: "Existe auditoria?",
    answer:
      "Sim. A Azura mantém trilha de auditoria de alterações relevantes, com identificação do usuário, entidade afetada e valores anteriores e novos quando aplicável."
  },
  {
    question: "Existe treinamento?",
    answer: "Sim. O Essencial inclui 1 hora e o Profissional 2 horas de treinamento de implantação."
  }
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

function DemoAccessButton({ children, variant = "outline" }: { children: React.ReactNode; variant?: "default" | "outline" }) {
  return (
    <form action={loginDemo}>
      <input type="hidden" name="role" value="ADMIN" />
      <Button type="submit" variant={variant} size="lg">
        {children}
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

function SectionIntro({
  badge,
  title,
  description
}: {
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <Badge variant="neutral">{badge}</Badge>
      <h2 className="mt-4 text-3xl font-semibold tracking-normal text-school-navy sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-8 text-text-secondary">{description}</p>
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
          <SchoolBrand href="/" variant="horizontal" imageClassName="h-10 max-w-[150px]" />
          <nav aria-label="Navegação principal" className="hidden items-center gap-7 text-sm font-medium text-text-secondary lg:flex">
            <Link href="#recursos" className="transition hover:text-school-primary">
              Recursos
            </Link>
            <Link href="#perfis" className="transition hover:text-school-primary">
              Perfis
            </Link>
            <Link href="#planos" className="transition hover:text-school-primary">
              Planos
            </Link>
            <Link href="#seguranca" className="transition hover:text-school-primary">
              Segurança
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
                Acessar demonstração
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div className="absolute inset-x-0 top-0 h-24 bg-white" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(460px,1fr)] lg:px-8 lg:py-20">
          <div className="relative z-10 max-w-3xl">
            <Badge variant="info" className="mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Azura - Sistema de Gestão Escolar
            </Badge>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-school-navy sm:text-5xl lg:text-6xl">
              Gestão acadêmica, comunicação e acompanhamento em uma única plataforma
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary sm:text-xl">
              Organize a rotina escolar com administração, professores, alunos e responsáveis conectados. No Plano
              Profissional, a escola também conta com gestão financeira integrada.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="#planos">
                  Conhecer a plataforma
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#perfis">Acessar demonstração</a>
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
          <SectionIntro
            badge="Recursos"
            title="Tudo o que sua escola precisa em um só lugar"
            description="A Azura reúne gestão acadêmica, acompanhamento escolar, comunicação e recursos financeiros no plano certo para cada rotina."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureGroups.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-lg border border-border bg-surface p-6 shadow-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-school-primary text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-school-navy">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{feature.description}</p>
                  <ul className="mt-5 space-y-2">
                    {feature.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-5 text-text-secondary">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-school-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
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

      <section id="planos" className="bg-background py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionIntro
              badge="Planos"
              title="Planos que acompanham o porte da sua escola"
              description="Escolha primeiro os recursos que sua escola precisa. Depois, selecione a capacidade contratada de acordo com o número de alunos ativos."
            />
            <div className="rounded-lg border border-school-primary/20 bg-school-primary-soft p-4 text-sm leading-6 text-school-navy lg:max-w-sm">
              <strong>Plano define funcionalidades.</strong> Capacidade define o porte contratado e não altera os
              recursos disponíveis em cada plano.
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={cn(
                  "rounded-lg border bg-white p-6 shadow-sm",
                  plan.featured ? "border-school-primary shadow-md" : "border-border"
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge variant={plan.featured ? "info" : "neutral"}>{plan.badge}</Badge>
                    <h3 className="mt-4 text-3xl font-semibold text-school-navy">{plan.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">{plan.description}</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface p-3 text-sm text-school-navy sm:min-w-44">
                    <p className="font-semibold">Treinamento</p>
                    <p className="mt-1 text-text-secondary">{plan.training}</p>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-md border border-border">
                  <div className="grid grid-cols-[1.15fr_0.95fr_0.95fr] bg-school-primary-soft px-4 py-3 text-xs font-semibold uppercase text-school-navy">
                    <span>Capacidade</span>
                    <span>Mensalidade</span>
                    <span>Implantação</span>
                  </div>
                  {plan.tiers.map((tier) => (
                    <div
                      key={tier.capacity}
                      className="grid grid-cols-[1.15fr_0.95fr_0.95fr] gap-3 border-t border-border px-4 py-4 text-sm"
                    >
                      <span className="font-medium text-text-primary">{tier.capacity}</span>
                      <strong className="text-school-navy">{tier.monthly}</strong>
                      <span className="text-text-secondary">{tier.setup}</span>
                    </div>
                  ))}
                </div>

                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm leading-5 text-text-secondary">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button asChild className="w-full">
                    <a href="#contato">
                      Solicitar demonstração
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="text-lg font-semibold text-school-navy">Sua escola possui mais de 500 alunos?</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Entre em contato para uma proposta personalizada conforme a operação e a capacidade necessária.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="text-lg font-semibold text-school-navy">Tarifas de terceiros</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Tarifas de meios de pagamento e serviços financeiros de terceiros não estão incluídas na mensalidade da
                Azura e podem ser cobradas pelo respectivo provedor.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="seguranca" className="border-y border-border bg-surface py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionIntro
            badge="Segurança e auditoria"
            title="Proteção, controle de acesso e rastreabilidade"
            description="A plataforma foi estruturada para apoiar a operação escolar com separação por escola, permissões por perfil e registro de alterações relevantes."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {securityItems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-lg border border-border bg-white p-6 shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-school-primary-soft text-school-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-school-navy">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{item.description}</p>
                </article>
              );
            })}
          </div>

          <p className="mt-6 text-sm leading-6 text-text-muted">
            Serviços externos de pagamento, e-mail e infraestrutura auxiliar possuem políticas e regiões próprias.
          </p>
        </div>
      </section>

      <section id="implantacao" className="bg-background py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <Badge variant="neutral">Implantação acompanhada</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-school-navy sm:text-4xl">
              Uma entrada organizada para a rotina da escola
            </h2>
            <p className="mt-5 text-lg leading-8 text-text-secondary">
              A implantação é conduzida como serviço real, com configuração, conferência dos dados e treinamento inicial
              para reduzir ruído na liberação do portal.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {implementationSteps.map((step, index) => (
              <div key={step} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                <span className="text-sm font-semibold text-school-primary">{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-2 font-semibold text-school-navy">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sobre" className="border-y border-border bg-surface py-16 sm:py-20">
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
            {[
              { title: "Gestão centralizada", description: "Administração, professores, alunos e responsáveis em uma única plataforma." },
              { title: "Acompanhamento contínuo", description: "Notas, frequência, desempenho e histórico organizados em um único fluxo." },
              { title: "Comunicação integrada", description: "Calendário e comunicados conectando toda a comunidade escolar." }
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-school-navy">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-background py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionIntro
            badge="Perguntas frequentes"
            title="Dúvidas comuns antes da demonstração"
            description="Respostas diretas sobre planos, capacidade, financeiro, segurança e implantação."
          />
          <div className="mt-10 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-lg border border-border bg-surface p-5 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-school-navy">
                  {faq.question}
                  <ChevronDown className="h-5 w-5 shrink-0 text-text-muted transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-school-primary py-16 text-white sm:py-20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <Badge className="bg-white/12 text-white ring-1 ring-white/20">Demonstração</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Quer conhecer a Azura na prática?</h2>
            <p className="mt-4 text-lg leading-8 text-white/78">
              Agende uma demonstração e veja como a plataforma pode organizar a rotina acadêmica e financeira da sua
              escola.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <Button asChild variant="secondary" size="lg">
              <a href="#contato">Solicitar demonstração</a>
            </Button>
            <DemoAccessButton>Acessar demonstração</DemoAccessButton>
          </div>
        </div>
      </section>

      <footer id="contato" className="border-t border-border bg-school-navy text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <SchoolBrand
              variant="full-dark"
              className="w-fit"
              imageClassName="h-20 max-w-[300px]"
            />
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/72">
              Plataforma integrada para gestão acadêmica, comunicação, acompanhamento escolar e gestão financeira no
              Plano Profissional.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Recursos</h3>
            <div className="mt-4 space-y-3 text-sm text-white/72">
              <a className="block hover:text-white" href="#recursos">
                Gestão acadêmica
              </a>
              <a className="block hover:text-white" href="#planos">
                Planos
              </a>
              <a className="block hover:text-white" href="#seguranca">
                Segurança
              </a>
              <a className="block hover:text-white" href="#implantacao">
                Implantação
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
              <p>Solicite uma demonstração comercial.</p>
              <p>Suporte e implantação acompanhada.</p>
              <a className="block hover:text-white" href="#faq">
                Perguntas frequentes
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/12">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {schoolConfig.academic.academicYear} {schoolConfig.name}. Todos os direitos reservados.</p>
            <p>Gestão escolar integrada · Segurança · Auditoria</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
