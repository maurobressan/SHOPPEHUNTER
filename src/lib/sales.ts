import { prisma } from "./db";
import { buildReport } from "./import/report";
import { getActiveFeeSchedule, getSettings } from "./settings";

export async function salesReport(accountId: string, days: number) {
  const s = await getSettings(accountId);
  const [lines, costs, fee] = await Promise.all([prisma.orderLine.findMany({ where: { accountId } }), prisma.skuCost.findMany({ where: { accountId } }), getActiveFeeSchedule(s.sellerType)]);
  if (!lines.length) return null;
  return buildReport(lines, {
    days,
    costs: Object.fromEntries(costs.map((c) => [c.sku, { unitCost: c.unitCost, packagingCost: c.packagingCost }])),
    rules: fee.rules,
  });
}
