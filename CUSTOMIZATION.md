# Customizacao por escola

Este projeto foi preparado para ser usado como uma base reutilizavel por uma unica escola por instalacao. Ele nao implementa SaaS multi-tenant: cada deploy deve apontar para uma escola, um banco e uma configuracao institucional.

## Arquivo principal

A configuracao central fica em `src/config/school.ts`.

Edite esse arquivo para ajustar:

- `name`, `shortName` e `initials`: identidade textual da escola.
- `description`, `landingTitle` e `landingSubtitle`: textos institucionais da pagina inicial e metadata.
- `branding`: caminhos dos arquivos de marca em `public/branding`.
- `theme`: cores em HSL usadas pelos tokens CSS do projeto.
- `academic`: ano letivo, sistema de periodos, nota minima, nota de recuperacao, frequencia minima e datas padrao.
- `features`: chaves para habilitar ou ocultar recursos por instalacao futura.
- `demo`: exibicao de demo, metricas, acessos rapidos, emails e senha padrao.

## Logos

Os arquivos padrao ficam em:

- `public/branding/logo.svg`
- `public/branding/logo-compact.svg`
- `public/branding/logo-horizontal.svg`

Substitua os SVGs mantendo os mesmos nomes, ou ajuste os caminhos em `schoolConfig.branding`.

Se uma marca nao estiver configurada, o componente `SchoolBrand` usa as iniciais definidas em `schoolConfig.initials`.

## Tema

As cores principais sao aplicadas em `src/app/layout.tsx` como variaveis CSS:

- `--primary`
- `--primary-foreground`
- `--accent`
- `--accent-foreground`
- `--ring`

Os defaults tambem estao declarados em `src/app/globals.css` para manter fallback local.

Use valores HSL sem `hsl()`, por exemplo:

```ts
theme: {
  primary: "207 72% 39%",
  primaryForeground: "0 0% 100%",
  accent: "156 45% 92%",
  accentForeground: "160 51% 21%"
}
```

## Regras academicas

As regras de situacao academica ficam em `src/lib/academic-rules.ts` e leem `schoolConfig.academic`.

Campos importantes:

- `passingGrade`: nota minima para aprovacao.
- `recoveryGrade`: nota minima para recuperacao.
- `minimumAttendance`: frequencia minima em porcentagem.
- `periodNames`: nomes iniciais dos periodos criados pelo seed.

Os periodos reais continuam persistidos no banco. A configuracao serve como padrao da instalacao e do seed.

## Modo demo

Para uma instalacao real, altere em `schoolConfig.demo`:

```ts
isDemo: false,
showDemoMetrics: false,
quickAccessEnabled: false
```

Com isso, a pagina inicial deixa de mostrar os acessos rapidos de apresentacao. A autenticacao demo tambem passa a recusar login rapido.

A senha demo pode ser sobrescrita por variavel de ambiente:

```bash
DEMO_PASSWORD="nova-senha"
```

## Seed

O seed usa a configuracao central para criar:

- nome e slug da escola;
- ano letivo ativo;
- nomes dos periodos;
- emails demo principais;
- dominio dos emails ficticios;
- senha demo.

Depois de alterar a configuracao, recrie os dados locais conforme o fluxo do projeto:

```bash
npm run prisma:seed
```

## Checklist de personalizacao

- Atualizar `src/config/school.ts`.
- Substituir logos em `public/branding`.
- Definir `DEMO_PASSWORD` no ambiente, se o modo demo continuar ativo.
- Desativar `demo.isDemo` e `demo.quickAccessEnabled` em instalacoes reais.
- Rodar seed quando precisar recriar dados demonstrativos.
- Rodar `npm run lint`.
- Rodar `npm run build`.
- Validar `/`, `/admin/dashboard`, `/professor/dashboard`, `/aluno/dashboard` e `/responsavel/dashboard`.

## Limites intencionais

Esta camada nao cria painel global de escolas, cobranca, planos, isolamento multi-tenant dinamico ou troca de escola em runtime. Para outra escola, use outra instalacao/deploy com seu proprio `schoolConfig` e banco.
