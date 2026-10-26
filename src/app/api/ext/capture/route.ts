import { prisma } from "@/lib/db";
import { ctxFromApiToken } from "@/lib/auth";
import { captureSchema, parseShopeeUrl } from "@/lib/ext";
import { evaluateAlerts } from "@/lib/alerts";

// Salva o anúncio que o usuário está vendo na Shopee (dados lidos da página pela extensão).
// No máximo 1 snapshot da extensão por anúncio por dia (o mais recente substitui o do dia).
export async function POST(req: Request) {
  const ctx = await ctxFromApiToken(req);
  if (!ctx) return Response.json({ error: "Token inválido." }, { status: 401 });
  if (!ctx.limits.extension) return Response.json({ error: "A extensão não está incluída no seu plano." }, { status: 403 });
  const parsed = captureSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dados inválidos: " + parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ") }, { status: 400 });
  const d = parsed.data;
  const ids = parseShopeeUrl(d.url);
  if (!ids) return Response.json({ error: "Não foi possível identificar o anúncio pela URL." }, { status: 400 });

  let productId: string | null = null;
  if (d.productId) {
    const p = await prisma.product.findFirst({ where: { id: d.productId, accountId: ctx.accountId } });
    if (!p) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    productId = p.id;
  } else if (d.newProductName) {
    const limit = ctx.limits.products;
    const used = await prisma.product.count({ where: { accountId: ctx.accountId, isDemo: false, status: { not: "descartado" } } });
    if (limit >= 0 && used >= limit) return Response.json({ error: `Seu plano permite ${limit} produtos. Faça upgrade para adicionar mais.` }, { status: 403 });
    productId = (await prisma.product.create({ data: { accountId: ctx.accountId, name: d.newProductName } })).id;
  }

  const cleanUrl = d.url.split("?")[0];
  const listing = await prisma.listing.upsert({
    where: { accountId_externalItemId_shopId: { accountId: ctx.accountId, externalItemId: ids.itemId, shopId: ids.shopId } },
    create: { accountId: ctx.accountId, externalItemId: ids.itemId, shopId: ids.shopId, title: d.title, shopName: d.shopName, url: cleanUrl, imageUrl: d.imageUrl, productId },
    update: { title: d.title, ...(d.shopName ? { shopName: d.shopName } : {}), ...(d.imageUrl ? { imageUrl: d.imageUrl } : {}), ...(productId ? { productId } : {}) },
  });

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = await prisma.snapshot.findFirst({ where: { listingId: listing.id, source: "extensao", collectedAt: { gte: dayStart } } });
  const data = { price: d.price, priceMax: d.priceMax, salesCumulative: d.sold, ratingStar: d.ratingStar, ratingCount: d.ratingCount, referenceDate: now, collectedAt: now, reliability: "media", raw: JSON.stringify(d) };
  if (today) await prisma.snapshot.update({ where: { id: today.id }, data });
  else await prisma.snapshot.create({ data: { ...data, listingId: listing.id, source: "extensao" } });

  const linked = productId ?? listing.productId;
  if (linked) await evaluateAlerts(ctx.accountId, linked);
  const count = await prisma.snapshot.count({ where: { listingId: listing.id } });
  return Response.json({ ok: true, listingId: listing.id, productId: linked, snapshots: count, updatedToday: !!today });
}
