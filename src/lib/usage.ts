import { prisma } from "./db";
import type { Ctx } from "./auth";

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export async function usage(accountId: string) {
  const [products, aiReports, imports, members] = await Promise.all([
    prisma.product.count({ where: { accountId, isDemo: false, status: { not: "descartado" } } }),
    prisma.aiReport.count({ where: { product: { accountId }, createdAt: { gte: monthStart() } } }),
    prisma.importBatch.count({ where: { accountId, importedAt: { gte: monthStart() } } }),
    prisma.membership.count({ where: { accountId } }),
  ]);
  return { products, aiReports, imports, members };
}

export type LimitKey = "products" | "aiReports" | "imports" | "members";

const LABEL: Record<LimitKey, string> = {
  products: "produtos monitorados",
  aiReports: "relatórios de análise neste mês",
  imports: "importações de planilha neste mês",
  members: "usuários na conta",
};

// Mensagem de bloqueio (ou null se ainda há espaço no plano).
export async function limitReached(ctx: Ctx, key: LimitKey): Promise<string | null> {
  const limit = ctx.limits[key];
  if (limit < 0) return null;
  const used = (await usage(ctx.accountId))[key];
  return used >= limit ? `Seu plano ${ctx.planName} permite ${limit} ${LABEL[key]}. Faça upgrade em Assinatura para continuar.` : null;
}
