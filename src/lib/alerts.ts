// Alertas automáticos depois de cada coleta/captura: queda de preço de concorrentes,
// novos concorrentes e margem estimada abaixo do mínimo. Evita repetir o mesmo alerta em 24h.
import { prisma } from "./db";
import { analyzeById } from "./analysis";
import { getSettings } from "./settings";
import { effectivePlanId, parseLimits } from "./plans";

async function notify(accountId: string, productId: string | null, kind: string, title: string, body: string) {
  const dup = await prisma.notification.findFirst({ where: { accountId, productId, title, createdAt: { gte: new Date(Date.now() - 86400000) } } });
  if (!dup) await prisma.notification.create({ data: { accountId, productId, kind, title, body } });
}

export async function evaluateAlerts(accountId: string, productId: string) {
  const sub = await prisma.subscription.findUnique({ where: { accountId } });
  const plan = await prisma.plan.findUnique({ where: { id: effectivePlanId(sub) } });
  if (!parseLimits(plan?.limits ?? "{}").alerts) return;
  const s = await getSettings(accountId);
  const product = await prisma.product.findFirst({
    where: { id: productId, accountId },
    include: { listings: { include: { snapshots: { orderBy: { referenceDate: "desc" }, take: 2 } } } },
  });
  if (!product) return;
  for (const l of product.listings) {
    const [cur, prev] = l.snapshots;
    if (cur?.price && prev?.price && cur.price < prev.price * (1 - s.alertPriceDropPct / 100))
      await notify(accountId, productId, "preco", `Concorrente baixou o preço em ${product.name}`, `${l.shopName || l.title}: de R$ ${prev.price.toFixed(2)} para R$ ${cur.price.toFixed(2)}.`);
    if (l.snapshots.length === 1 && Date.now() - l.firstSeenAt.getTime() < 86400000 && product.listings.length > 1)
      await notify(accountId, productId, "concorrente", `Novo concorrente em ${product.name}`, `${l.title}${l.shopName ? ` (${l.shopName})` : ""}.`);
  }
  const a = await analyzeById(accountId, productId, 30);
  if (a?.calc && a.calc.contributionPct * 100 < s.alertMinMarginPct)
    await notify(accountId, productId, "margem", `Margem baixa em ${product.name}`, `Margem estimada de ${(a.calc.contributionPct * 100).toFixed(1)}% ao preço de R$ ${a.salePrice?.toFixed(2)} (mínimo configurado: ${s.alertMinMarginPct}%).`);
}
