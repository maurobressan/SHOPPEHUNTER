# Publicar o Shopee Hunter Pro (GitHub + Vercel + Neon Postgres)

O projeto já está preparado:
- `prisma/postgres/` → esquema e migração do banco de produção (PostgreSQL), testados.
- `vercel.json` → região São Paulo (`gru1`) e coleta diária às 06:00 (horário de Brasília).
- Script `vercel-build` → aplica as migrações, cria planos e tabelas de comissão e compila o site.

## Contas que você precisa criar
| # | Serviço | Para quê | Custo |
|---|---|---|---|
| 1 | **GitHub** — github.com | guardar o código (repositório privado) | grátis |
| 2 | **Vercel** — vercel.com → *Continue with GitHub* | hospedar o site | grátis para testar; **Pro US$ 20/mês ao começar a cobrar** (o plano Hobby não permite uso comercial) |
| 3 | **Neon** (Postgres) | banco de dados | criado **de dentro da Vercel**, sem cadastro separado; plano grátis |

Depois, quando for vender: **Stripe** (pagamentos), **Resend** (e-mails), **Registro.br** (domínio .com.br).

## Passo 1 — GitHub
1. Crie a conta em github.com.
2. Clique em **New repository** → nome `shopee-hunter-pro` → **Private** → **não** marque README/.gitignore → *Create repository*.
3. Copie o endereço que aparece (ex.: `https://github.com/SEU-USUARIO/shopee-hunter-pro.git`) e mande para o Claude, que envia o código. Na primeira vez, o Windows abre o navegador para você autorizar o GitHub.

## Passo 2 — Vercel + banco
1. Em vercel.com, entre com o GitHub.
2. **Add New → Project** → importe `shopee-hunter-pro`. **Ainda não clique em Deploy**: abra *Environment Variables* e adicione:
   | Nome | Valor |
   |---|---|
   | `CRON_SECRET` | o valor que está no arquivo `segredos-vercel.txt` (na pasta do projeto; ele não vai para o GitHub) |
   | `TRIAL_DAYS` | `7` |
   | `COMPANY_NAME`, `COMPANY_DOC`, `SUPPORT_EMAIL` | dados da sua empresa (aparecem nos Termos) |
3. Clique em **Deploy**. O primeiro deploy vai **falhar** porque ainda não há banco: é esperado.
4. No projeto: **Storage → Create Database → Neon (Postgres)** → região **São Paulo** → *Connect* ao projeto (marque Production e Preview). Isso cria sozinho `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
5. **Deployments → ⋯ → Redeploy**. Agora deve ficar verde.
6. Abra o endereço `https://shopee-hunter-pro-xxxx.vercel.app` e **cadastre-se primeiro**: o primeiro usuário vira administrador.

## Passo 3 — quando for vender
- **Stripe:** crie produtos Pro/Business com preço mensal em BRL, cole os `price_...` em *Administração → Planos*, crie o webhook `https://SEU-SITE/api/billing/webhook` (eventos `checkout.session.completed`, `customer.subscription.created/updated/deleted`) e adicione `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` na Vercel.
- **Resend:** `RESEND_API_KEY` e `EMAIL_FROM` (recuperação de senha e convites).
- **Domínio:** Vercel → *Settings → Domains*; depois defina `APP_URL=https://seudominio.com.br`.
- **Coleta automática:** `SHOPEE_AFFILIATE_APP_ID` e `SHOPEE_AFFILIATE_SECRET` — só depois de confirmar com a Shopee que o uso em serviço pago é permitido.
- **Extensão:** publique a pasta `extensao/` na Chrome Web Store (US$ 5, uma vez) e troque `host_permissions` no `manifest.json` para o seu domínio.
- Revise **Termos** e **Privacidade** com um advogado.

## Atualizações futuras
Cada `git push` para o GitHub publica a nova versão automaticamente na Vercel. Se mudar o banco, veja a seção "Mudando o banco de dados" no README.

## Problemas comuns
- *"prepared statement already exists"*: na Vercel, edite `DATABASE_URL` e acrescente `&pgbouncer=true` ao final.
- Build falha em `prisma migrate deploy`: confira se `DATABASE_URL_UNPOOLED` existe (passo 2.4).
