// Coleta agendável: npm run coletar (Agendador de Tarefas do Windows, 1x por dia).
// Em servidor, use o cron chamando /api/cron/coletar.
import { readFileSync, existsSync } from "node:fs";
import { collectAllAccounts } from "../src/lib/collector";
import { prisma } from "../src/lib/db";

if (existsSync(".env"))
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(?:"([^"]*)"|([^#\s]*))/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2] ?? m[3] ?? "";
  }

collectAllAccounts()
  .then((rs) => {
    if (!rs.length) console.log(`${new Date().toISOString()} Nenhuma conta com coleta automática no plano.`);
    for (const r of rs) console.log(`${new Date().toISOString()} conta ${r.accountId}: ${r.collected} snapshots, ${r.errors} erro(s)`);
  })
  .finally(() => prisma.$disconnect());
