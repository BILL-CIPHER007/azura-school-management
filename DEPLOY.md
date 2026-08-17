# Deploy

Este documento descreve um deploy genérico. Não há configuração específica da Hostinger porque o tipo de plano não foi confirmado.

## Build

```bash
npm install
npm run build
```

## Variáveis de Ambiente

Defina no ambiente de produção:

```bash
DATABASE_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=
DEMO_PASSWORD=
```

Use um `AUTH_SECRET` forte e nunca publique credenciais reais no repositório.

## PostgreSQL e Prisma

Crie um banco PostgreSQL e aplique as migrations:

```bash
npm run prisma:generate
npx prisma migrate deploy
```

Para ambientes de demonstração, rode:

```bash
npm run prisma:seed
```

## Processo Node.js

Em servidor tradicional:

```bash
npm run build
npm start
```

Se usar PM2 ou outro supervisor, configure reinício automático e variáveis de ambiente.

## Docker

O projeto inclui `Dockerfile` e `docker-compose.yml` para aplicação e PostgreSQL. Para produção, troque senhas, secrets e volumes conforme o provedor.

```bash
docker compose up --build -d
```

## Domínio e HTTPS

Após o serviço estar rodando:

- aponte o domínio para o servidor;
- configure HTTPS com o provedor, proxy reverso ou certificado gerenciado;
- atualize `NEXT_PUBLIC_APP_URL` para o domínio final.

## Proxy Reverso

Quando necessário, use Nginx, Caddy, Traefik ou recurso equivalente do provedor para encaminhar tráfego HTTPS para a porta do processo Next.js.

## Checklist

- Banco PostgreSQL acessível pela aplicação
- `AUTH_SECRET` forte
- Migrations aplicadas
- Seed executado apenas em demo/homologação
- HTTPS ativo
- Processo Node.js supervisionado
- Backups do banco configurados
