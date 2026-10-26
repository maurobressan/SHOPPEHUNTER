import { prisma } from "@/lib/db";
import { ctxFromApiToken } from "@/lib/auth";
import { getActiveFeeSchedule, getSettings } from "@/lib/settings";
import { parseShopeeUrl } from "@/lib/ext";

// Dados para o painel da extensão: produtos da conta, custos padrão, regras de tarifa vigentes
// e, se o anúncio aberto já é acompanhado, o histórico salvo.
export async function GET(req: Request) {
  const ctx = await ctxFromApiToken(req);
  if (!ctx) return Response.json({ error: "Token inválido. Gere um novo em Minha conta → Extensão." }, { status: 401 });
  if (!ctx.limits.extension) return Response.json({ error: "A extensão não está incluída no seu plano." }, { status: 403 });
  const s = await getSettings(ctx.accountId);
  const fee = await getActiveFeeSchedule(s.sellerType);
  const ids = parseShopeeUrl(new URL(req.url).searchParams.get("url") ?? "");
  const listing = ids
    ? await prisma.listing.findFirst({
        where: { accountId: ctx.accountId, shopId: ids.shopId, externalItemId: ids.itemId },
        include: { product: { select: { id: true, name: true } }, snapshots: { orderBy: { referenceDate: "desc" }, take: 10, select: { referenceDate: true, price: true, salesCumulative: true } } },
      })
    : null;
  const products = await prisma.product.findMany({ where: { accountId: ctx.accountId, isDemo: false, status: { not: "descartado" } }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });
  return Response.json({
    plan: ctx.planId,
    products,
    defaults: { sellerType: s.sellerType, cpfHighVolume: s.cpfHighVolume, packagingCost: s.packagingCost, shippingCost: s.shippingCost, taxPct: s.taxPct, adsPct: s.adsPct, lossPct: s.lossPct, otherVariableCost: s.otherVariableCost },
    rules: fee.rules,
    rulesName: fee.name,
    listing: listing && { product: listing.product, snapshots: listing.snapshots },
  });
}
