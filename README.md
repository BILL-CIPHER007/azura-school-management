# Azura — Sistema de Gestão Escolar

Plataforma de gestão escolar com áreas integradas para **Administração**, **Professores**, **Alunos** e **Responsáveis**. O projeto foi estruturado como uma base genérica e comercial, preparada para receber personalização de marca, escola demonstrativa ou identidade própria por instalação.

## Tecnologias

- Next.js App Router
- TypeScript strict
- React
- Tailwind CSS
- Componentes no estilo shadcn/ui
- Lucide Icons
- Prisma ORM
- PostgreSQL
- Zod
- bcryptjs para hash de senha
- JWT em cookie `httpOnly`

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 16+ ou Docker

## Instalação

```bash
npm install
cp .env.example .env
```

Configure `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` e `DEMO_PASSWORD`.

## Banco de Dados

O schema Prisma está em `prisma/schema.prisma` e modela o sistema multi-escola com `schoolId` nas entidades acadêmicas. Para preparar o banco local:

```bash
npm run prisma:migrate
npm run prisma:seed
```

O seed cria uma **Escola Demonstrativa**, 4 turmas, 6 disciplinas, 5 professores, mais de 30 alunos, responsáveis, notas, frequências, comunicados e eventos.

## Usuários de Demonstração

Senha padrão de desenvolvimento: valor de `DEMO_PASSWORD`, ou `demo123` se não estiver definido.

- Administrador: `admin@demo.azura.local`
- Professor: `professor@demo.azura.local`
- Aluno: `aluno@demo.azura.local`
- Responsável: `responsavel@demo.azura.local`

## Execução

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Qualidade

```bash
npm run lint
npm run build
```

O build executa `prisma generate` antes de compilar o Next.js.

## Estrutura

- `src/app`: rotas, layouts e server actions
- `src/components`: componentes reutilizáveis de UI e dashboards
- `src/lib`: Prisma, autenticação, sessão e utilitários
- `src/services`: consultas e regras de leitura por domínio
- `prisma`: schema e seed

## Personalização por escola

A marca do produto fica centralizada em `src/config/school.ts`. Cada escola pode receber nome, logo, textos institucionais, domínio de e-mails fictícios e configurações acadêmicas próprias sem alterar as regras centrais do sistema. Consulte `CUSTOMIZATION.md` para o checklist de adaptação.

## Docker

```bash
docker compose up --build
```

Depois que o banco estiver disponível, execute migrations e seed conforme o ambiente escolhido.

## Segurança do MVP

- Cookies `httpOnly`
- Hash de senha
- Middleware por perfil
- Validação server-side com Zod
- Consultas filtradas por `schoolId`
- Verificação de vínculo do professor antes de alterar notas/frequência
- Auditoria básica para matrícula, notas e frequência
