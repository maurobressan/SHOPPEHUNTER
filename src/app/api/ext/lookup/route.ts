import { z } from "zod";
import { prisma } from "@/lib/db";
import { ctxFromApiToken } from "@/lib/auth";

const schema = z.object({ items: z.array(z.object({ shopId: z.string().regex(/^\d+$/), itemId: z.string().regex(/^\d+$/) })).max(120) });

// Para os anúncios visíveis numa busca da Shopee, diz quais já são acompanhados e quanto
// venderam entre o primeiro e o último registro dos últimos 30 dias (diferença de "vendidos").
export async function POST(req: Request) {
  const ctx = await ctxFromApiToken(req);
  if (!ctx) return Response.json({ error: "Token inválido." }, { status: 401 });
  if (!ctx.limits.extension) return Response.json({ error: "A extensão não está incluída no seu plano." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dados inválidos." }, { status: 400 });

  const since = new Date(Date.now() - 30 * 86400000);
  const listings = await prisma.listing.findMany({
    where: { accountId: ctx.accountId, OR: parsed.data.items.map((i) => ({ shopId: i.shopId, externalItemId: i.itemId })) },
    select: {
      shopId: true,
      externalItemId: true,
      product: { select: { name: true } },
      snapshots: { where: { referenceDate: { gte: since }, salesCumulative: { not: null } }, orderBy: { referenceDate: "asc" }, select: { referenceDate: true, salesCumulative: true } },
    },
  });

  return Response.json({
    items: listings.map((l) => {
      const first = l.snapshots[0];
      const last = l.snapshots[l.snapshots.length - 1];
      const days = first && last ? (last.referenceDate.getTime() - first.referenceDate.getTime()) / 86400000 : 0;
      const sold = first && last && days >= 1 ? Math.max(0, last.salesCumulative! - first.salesCumulative!) : null;
      return {
        key: `${l.shopId}.${l.externalItemId}`,
        product: l.product?.name ?? null,
        records: l.snapshots.length,
        measured: sold === null ? null : { sold, days: Math.round(days), from: first!.referenceDate, to: last!.referenceDate },
      };
    }),
  });
}
