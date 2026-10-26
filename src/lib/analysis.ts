// Monta a análise completa de um produto a partir do banco (servidor), sempre dentro de uma conta.
import { prisma } from "./db";
import { getActiveFeeSchedule, getSettings, scope, type AppSettings } from "./settings";
import { computeTrend, dailySeries, type ListingSeries } from "./trends";
import { analyzeCompetition, type CompListing } from "./competition";
import { calculate, type CalcInput } from "./calculator";
import { hunterScore } from "./hunter-score";
import { groupSimilar } from "./similarity";
import { simulateLot } from "./cashflow";
import type { FeeRules } from "./fees";

const productInclude = {
  listings: { include: { snapshots: { orderBy: { referenceDate: "asc" as const } } } },
  quotes: { include: { supplier: true }, orderBy: { quoteDate: "desc" as const } },
};

type ProductFull = NonNullable<Awaited<ReturnType<typeof loadProduct>>>;

export async function loadProduct(accountId: string, id: string) {
  return prisma.product.findFirst({ where: { id, accountId }, include: productInclude });
}

export function baseCalcInput(s: AppSettings, price: number, unitCost: number): CalcInput {
  return {
    price,
    unitsPerListing: 1,
    unitCost,
    packagingCost: s.packagingCost,
    sellerDiscountPct: 0,
    sellerDiscountValue: 0,
    shippingCost: s.shippingCost,
    taxPct: s.taxPct,
    adsPct: s.adsPct,
    otherVariableCost: s.otherVariableCost,
    lossPct: s.lossPct,
    fixedMonthly: s.fixedMonthly,
    monthlyVolume: 100,
  };
}

export const feeOpts = (s: AppSettings) => ({ cpfHighVolume: s.sellerType === "CPF" && s.cpfHighVolume });

export function analyzeProduct(p: ProductFull, s: AppSettings, rules: FeeRules, periodDays: number, now = new Date()) {
  const series: ListingSeries[] = p.listings.map((l) => ({
    id: l.id,
    firstSeenAt: l.firstSeenAt,
    snaps: l.snapshots.map((x) => ({ t: x.referenceDate, price: x.price, salesCumulative: x.salesCumulative, ratingCount: x.ratingCount, ratingStar: x.ratingStar })),
  }));
  const comp: CompListing[] = p.listings.map((l) => {
    const last = l.snapshots[l.snapshots.length - 1];
    return {
      id: l.id,
      title: l.title,
      shopId: l.shopId,
      shopName: l.shopName,
      url: l.url,
      price: last?.price ?? null,
      salesCumulative: last?.salesCumulative ?? null,
      ratingStar: last?.ratingStar ?? null,
      ratingCount: last?.ratingCount ?? null,
      weakPhotos: l.weakPhotos,
      weakDescription: l.weakDescription,
    };
  });
  const competition = analyzeCompetition(comp, rules, p.listings.length >= 50);
  const trend = computeTrend(series, now, periodDays, competition.saturation);

  const priced = p.quotes.filter((q) => q.unitPrice !== null);
  const chosen =
    p.quotes.find((q) => q.id === p.chosenQuoteId && q.unitPrice !== null) ??
    [...priced].sort((a, b) => (a.supplier.country === "Brasil" ? 0 : 1) - (b.supplier.country === "Brasil" ? 0 : 1) || a.unitPrice! - b.unitPrice!)[0] ??
    null;
  const median = competition.price?.median;
  const salePrice = p.targetPrice ?? (median !== undefined ? Math.round(median * 100) / 100 : null);
  let calc = null;
  let landedCost: number | null = null;
  let lot = null;
  const lotUnits = chosen?.moq ?? s.testLotUnits;
  if (chosen && salePrice) {
    landedCost = chosen.unitPrice! + (chosen.shippingCost ?? 0) / Math.max(1, lotUnits);
    calc = calculate(baseCalcInput(s, salePrice, landedCost), rules, feeOpts(s));
    // Hipótese conservadora e explícita: capturar 5% das vendas mensais observadas no mercado (limitado ao lote)
    const marketMonthly = trend.salesPeriod ? (trend.salesPeriod.value / periodDays) * 30 : null;
    const hypothesis = marketMonthly ? Math.max(1, Math.min(lotUnits, Math.round(marketMonthly * 0.05))) : null;
    if (hypothesis)
      lot = {
        hypothesis,
        ...simulateLot({
          lotUnits,
          unitCost: chosen.unitPrice!,
          freight: chosen.shippingCost ?? 0,
          otherUpfront: 0,
          netPerSale: calc.contributionMargin + calc.productCost,
          salesPerMonth: hypothesis,
          payoutDelayDays: s.payoutDelayDays,
        }),
      };
  }
  const investment = chosen ? lotUnits * chosen.unitPrice! + (chosen.shippingCost ?? 0) : null;
  const score = hunterScore(
    {
      sales: trend.salesPeriod,
      periodDays,
      growth: trend.growthPeriod,
      saturation: competition.saturation,
      marginPct: calc ? calc.contributionPct : null,
      suppliersWithPrice: priced.reduce((n, q) => n + (q.supplier.country === "Brasil" ? 1 : 0.6), 0),
      suppliersOnRequest: p.quotes.filter((q) => q.unitPrice === null).length,
      spike: trend.spike,
      spanDays: trend.spanDays,
      investment,
    },
    s.weights,
  );
  return {
    product: p,
    trend,
    competition,
    chosenQuote: chosen,
    salePrice,
    salePriceSource: p.targetPrice ? "preço-alvo definido por você" : competition.price ? "mediana dos concorrentes observados" : null,
    landedCost,
    calc,
    lot,
    investment,
    score,
    similarGroups: groupSimilar(comp.map((c) => ({ id: c.id, title: c.title, price: c.price }))).filter((g) => g.length > 1),
    daily: dailySeries(series, now, Math.min(90, Math.max(periodDays, 30))),
    sources: [...new Set(p.listings.flatMap((l) => l.snapshots.map((x) => x.source)))],
    lastCollected: p.listings.flatMap((l) => l.snapshots.map((x) => x.collectedAt)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
  };
}

export type ProductAnalysis = ReturnType<typeof analyzeProduct>;

export async function analyzeById(accountId: string, id: string, periodDays = 30) {
  const p = await loadProduct(accountId, id);
  if (!p) return null;
  const s = await getSettings(accountId);
  const fee = await getActiveFeeSchedule(s.sellerType);
  return analyzeProduct(p, s, fee.rules, periodDays);
}

export async function analyzeAll(accountId: string, periodDays = 30) {
  const where = await scope(accountId);
  const products = await prisma.product.findMany({ where: { ...where, status: { not: "descartado" } }, include: productInclude });
  const s = await getSettings(accountId);
  const fee = await getActiveFeeSchedule(s.sellerType);
  const now = new Date();
  return products.map((p) => analyzeProduct(p, s, fee.rules, periodDays, now));
}
