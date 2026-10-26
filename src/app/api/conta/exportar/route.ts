import { prisma } from "@/lib/db";
import { getCtx } from "@/lib/auth";

// Portabilidade (LGPD art. 18): todos os dados da conta ativa em JSON.
export async function GET() {
  const ctx = await getCtx();
  if (!ctx) return new Response("Não autenticado.", { status: 401 });
  const accountId = ctx.accountId;
  const data = {
    exportadoEm: new Date().toISOString(),
    conta: await prisma.account.findUnique({ where: { id: accountId }, select: { id: true, name: true, createdAt: true } }),
    usuarios: await prisma.membership.findMany({ where: { accountId }, select: { role: true, user: { select: { name: true, email: true, createdAt: true } } } }),
    assinatura: await prisma.subscription.findUnique({ where: { accountId }, select: { planId: true, status: true, currentPeriodEnd: true, trialEndsAt: true } }),
    configuracoes: await prisma.accountSetting.findUnique({ where: { accountId } }),
    produtos: await prisma.product.findMany({ where: { accountId }, include: { quotes: { include: { supplier: true } }, reports: true } }),
    anuncios: await prisma.listing.findMany({ where: { accountId }, include: { snapshots: { select: { source: true, collectedAt: true, referenceDate: true, price: true, salesCumulative: true, ratingStar: true, ratingCount: true, reliability: true } } } }),
    fornecedores: await prisma.supplier.findMany({ where: { accountId } }),
    importacoes: await prisma.importBatch.findMany({ where: { accountId }, include: { lines: true } }),
    custosPorSku: await prisma.skuCost.findMany({ where: { accountId } }),
    alertas: await prisma.notification.findMany({ where: { accountId } }),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="shopee-hunter-dados-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}
