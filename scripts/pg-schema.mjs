// Gera prisma/postgres/schema.prisma (produção) a partir de prisma/schema.prisma (local, SQLite).
// Rode sempre que alterar o esquema:  npm run db:pg:sync   e depois crie a migração (veja DEPLOY.md).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync("prisma/schema.prisma", "utf8");
const out = src
  .replace(/provider\s*=\s*"sqlite"/, 'provider  = "postgresql"')
  // nomes criados automaticamente pela integração Vercel + Neon (URL com pool e sem pool)
  .replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url       = env("DATABASE_URL")\n  directUrl = env("DATABASE_URL_UNPOOLED")')
  .replace(/^\/\/ Banco multi-conta.*\n(\/\/.*\n)*/m, "// GERADO por scripts/pg-schema.mjs a partir de prisma/schema.prisma — não edite à mão.\n");
if (out === src) throw new Error("Não foi possível converter o schema.");
mkdirSync("prisma/postgres", { recursive: true });
writeFileSync("prisma/postgres/schema.prisma", out);
console.log("prisma/postgres/schema.prisma atualizado.");
