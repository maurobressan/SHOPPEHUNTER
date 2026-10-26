# Shopee Hunter Pro

SaaS de inteligência comercial para vendedores da Shopee Brasil: tendências, concorrência, fornecedores e lucro real por venda com as tarifas oficiais.

- **Rodar no Windows:** dois cliques em `iniciar.bat` → http://localhost:3000
- **Publicar na internet:** [DEPLOY.md](DEPLOY.md)
- **O que já foi feito e limitações:** [PROGRESSO.md](PROGRESSO.md)
- **Extensão do Chrome:** pasta `extensao/`

## Tecnologia
Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind · Recharts · Prisma (SQLite local / PostgreSQL em produção) · Stripe · Vitest.

## Comandos
| Comando | O que faz |
|---|---|
| `npm test` | testes automáticos |
| `npm run build` | build local (SQLite) |
| `npm run db:pg:sync` | atualiza `prisma/postgres/schema.prisma` após mudar o esquema |
| `npm run vercel-build` | build de produção (Postgres): migrações + dados base + Next |
| `npm run coletar` | coleta diária pela API de Afiliados |

## Mudando o banco de dados
1. Edite `prisma/schema.prisma` e rode `npm run db:push` (local).
2. Rode `npm run db:pg:sync`.
3. Gere a migração de produção:
   `npx prisma migrate diff --from-schema-datamodel <schema anterior> --to-schema-datamodel prisma/postgres/schema.prisma --script -o prisma/postgres/migrations/<data>_<nome>/migration.sql`
   (ou `npx prisma migrate dev --schema prisma/postgres/schema.prisma` apontando para um Postgres de desenvolvimento).
