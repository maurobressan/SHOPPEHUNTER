// Serviço de coleta: grava snapshots da API oficial de Afiliados para uma conta.
// Pode rodar pelo app (botão), pelo agendador do Windows (npm run coletar) ou pelo cron do servidor (/api/cron/coletar).
import { prisma } from "./db";
import { affiliateConfig, searchOffers, type AffiliateOffer, type SearchParams } from "./sources/shopee-affiliate";
import { evaluateAlerts } from "./alerts";
import { effectivePlanId, parseLimits } from "./plans";

export interface CollectResult {
  ok: boolean;
  message: string;
  items: number;
  skippedSameDay: number;
  offers: AffiliateOffer[];
  hasNextPage: boolean;
}

export async function collectSearch(accountId: string, params: SearchParams, productId?: string): Promise<CollectResult> {
  const cfg = affiliateConfig();
  if (!cfg) return { ok: false, message: "Integração Shopee Afiliados não configurada no servidor.", items: 0, skippedSameDay: 0, offers: [], hasNextPage: false };
  const run = await prisma.collectionRun.create({ data: { accountId, source: "shopee_affiliate_api", status: "parcial", message: JSON.stringify(params) } });
  try {
    const { offers, hasNextPage } = await searchOffers(cfg, params);
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let items = 0;
    let skipped = 0;
    for (const o of offers) {
      const listing = await prisma.listing.upsert({
        where: { accountId_externalItemId_shopId: { accountId, externalItemId: o.itemId, shopId: o.shopId } },
        create: { accountId, externalItemId: o.itemId, shopId: o.shopId, shopName: o.shopName, title: o.productName, url: o.productLink || o.offerLink, imageUrl: o.imageUrl, categoryIds: o.productCatIds.join(","), productId: productId ?? null },
        update: { title: o.productName, shopName: o.shopName, imageUrl: o.imageUrl, ...(productId ? { productId } : {}) },
      });
      const exists = await prisma.snapshot.findFirst({ where: { listingId: listing.id, source: "shopee_affiliate_api", collectedAt: { gte: dayStart } } });
      if (exists) {
        skipped++;
        continue;
      }
      await prisma.snapshot.create({
        data: {
          listingId: listing.id,
          source: "shopee_affiliate_api",
          collectedAt: now,
          referenceDate: now,
          price: o.price ?? o.priceMin,
          priceMin: o.priceMin,
          priceMax: o.priceMax,
          salesCumulative: o.sales === null ? null : Math.round(o.sales),
          ratingStar: o.ratingStar,
          reliability: "alta",
          raw: JSON.stringify(o.raw),
        },
      });
      items++;
    }
    const message = `${offers.length} anúncios recebidos, ${items} snapshots gravados, ${skipped} já coletados hoje.`;
    await prisma.collectionRun.update({ where: { id: run.id }, data: { status: "ok", finishedAt: new Date(), items, message } });
    if (productId) await evaluateAlerts(accountId, productId);
    return { ok: true, message, items, skippedSameDay: skipped, offers, hasNextPage };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.collectionRun.update({ where: { id: run.id }, data: { status: "erro", finishedAt: new Date(), message } });
    return { ok: false, message, items: 0, skippedSameDay: 0, offers: [], hasNextPage: false };
  }
}

export async function collectAccount(accountId: string) {
  const products = await prisma.product.findMany({ where: { accountId, isDemo: false, status: { not: "descartado" }, keywords: { not: "" } } });
  const results: { product: string; keyword: string; result: CollectResult }[] = [];
  for (const p of products)
    for (const kw of p.keywords.split(",").map((k) => k.trim()).filter(Boolean))
      results.push({ product: p.name, keyword: kw, result: await collectSearch(accountId, { keyword: kw, sortType: 2, limit: 50 }, p.id) });
  return results;
}

// Coleta de todas as contas cujo plano inclui coleta automática.
export async function collectAllAccounts() {
  const accounts = await prisma.account.findMany({ include: { subscription: true } });
  const plans = new Map((await prisma.plan.findMany()).map((p) => [p.id, parseLimits(p.limits)]));
  const summary: { accountId: string; collected: number; errors: number }[] = [];
  for (const a of accounts) {
    if (!plans.get(effectivePlanId(a.subscription))?.autoCollect) continue;
    const rs = await collectAccount(a.id);
    summary.push({ accountId: a.id, collected: rs.reduce((n, r) => n + r.result.items, 0), errors: rs.filter((r) => !r.result.ok).length });
  }
  return summary;
}
