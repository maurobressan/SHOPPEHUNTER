import Link from "next/link";
import { prisma } from "@/lib/db";
import { salesReport } from "@/lib/sales";
import { deleteBatch, saveSkuCost } from "@/app/actions/app";
import { requireCtx } from "@/lib/auth";
import { Importer } from "./Importer";
import { Card, PageHeader, Stat, Table, td, Empty, Badge, Notice, btnGhost, input } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";
import { brl, date, dateTime, int, str } from "@/lib/format";

export default async function Vendas({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const dias = [7, 30, 90].includes(Number(str(sp.dias))) ? Number(str(sp.dias)) : 30;
  const ctx = await requireCtx();
  const [rep, batches, costs] = await Promise.all([
    salesReport(ctx.accountId, dias),
    prisma.importBatch.findMany({ where: { accountId: ctx.accountId }, orderBy: { importedAt: "desc" } }),
    prisma.skuCost.findMany({ where: { accountId: ctx.accountId } }),
  ]);
  const costMap = new Map(costs.map((c) => [c.sku, c]));

  return (
    <>
      <PageHeader title="Minhas Vendas" subtitle="Importe as planilhas de pedidos da sua loja. Funciona sem nenhuma integração externa.">
        <div className="flex rounded-lg border border-line bg-panel p-1">
          {[7, 30, 90].map((d) => <Link key={d} href={`/vendas?dias=${d}`} className={`rounded-md px-3 py-1 text-sm ${d === dias ? "bg-brand-blue/20 text-brand-blue" : "text-mute"}`}>{d} dias</Link>)}
        </div>
        {rep && <a href={`/api/vendas/export?dias=${dias}`} className={btnGhost}>Exportar CSV</a>}
      </PageHeader>
      <Flash sp={sp} />
      <Importer />
      {!rep ? (
        <div className="mt-6"><Empty title="Nenhum pedido importado">Importe a planilha de pedidos exportada do Centro do Vendedor.</Empty></div>
      ) : (
        <>
          <div className="mt-6 text-xs text-mute">Período: {date(rep.from)} a {date(rep.to)} (relativo ao pedido mais recente importado). Somente pedidos concluídos entram no faturamento.</div>
          <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-6">
            <Stat label="Pedidos concluídos" value={int(rep.totals.orders)} />
            <Stat label="Unidades" value={int(rep.totals.units)} />
            <Stat label="Faturamento bruto" value={brl(rep.totals.gross)} tone="blue" />
            <Stat label="Taxas" value={brl(rep.totals.fees)} hint={rep.totals.feesEstimatedAny ? "inclui estimativas" : "da planilha"} />
            <Stat label="Receita líquida" value={brl(rep.totals.netRevenue)} />
            <Stat label="Lucro estimado" value={brl(rep.totals.profit)} tone="green" hint={rep.totals.skusWithoutCost ? `${rep.totals.skusWithoutCost} SKU sem custo (não incluídos)` : "custos cadastrados"} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge tone="red">{rep.totals.cancelled} un. canceladas</Badge>
            <Badge tone="amber">{rep.totals.returned} un. devolvidas</Badge>
            <Badge>{rep.totals.pending} un. pendentes (não concluídas)</Badge>
            <Badge>desc. vendedor {brl(rep.totals.sellerDiscount)}</Badge>
            <Badge tone="blue">desc. Shopee {brl(rep.totals.shopeeDiscount)} (não afeta seu repasse)</Badge>
            <Badge>reembolsos {brl(rep.totals.refunds)}</Badge>
          </div>
          {rep.notes.length > 0 && <div className="mt-3 space-y-1">{rep.notes.map((n) => <Notice key={n} tone="amber">{n}</Notice>)}</div>}
          <Card title="Produtos mais vendidos" className="mt-6">
            <Table head={["SKU / produto", "Pedidos", "Unid.", "Bruto", "Taxas", "Receita líq.", "Custo un. + emb.", "Lucro", "Canc./Dev./Pend."]}>
              {rep.rows.map((r) => {
                const c = costMap.get(r.sku);
                return (
                  <tr key={r.sku}>
                    <td className={`${td} max-w-xs`}><div className="font-medium">{r.sku}</div><div className="text-xs text-mute">{r.productName}</div></td>
                    <td className={td}>{r.orders}</td>
                    <td className={td}>{r.units}</td>
                    <td className={td}>{brl(r.gross)}</td>
                    <td className={td}>{brl(r.fees)} {r.feesEstimated && <Badge tone="amber">estim.</Badge>}</td>
                    <td className={td}>{brl(r.netRevenue)}</td>
                    <td className={td}>
                      <form action={saveSkuCost} className="flex gap-1">
                        <input type="hidden" name="sku" value={r.sku} /><input type="hidden" name="_back" value={`/vendas?dias=${dias}`} />
                        <input name="unitCost" defaultValue={c?.unitCost ?? ""} placeholder="custo" className={`${input} w-20 py-1`} />
                        <input name="packagingCost" defaultValue={c?.packagingCost ?? ""} placeholder="emb." className={`${input} w-16 py-1`} />
                        <button className="text-xs text-brand-blue">ok</button>
                      </form>
                    </td>
                    <td className={`${td} font-medium ${r.profit !== null && r.profit < 0 ? "text-bad" : "text-ok"}`}>{r.profit === null ? <span className="text-xs text-mute">sem custo</span> : brl(r.profit)}</td>
                    <td className={`${td} text-xs text-mute`}>{r.cancelled}/{r.returned}/{r.pending}</td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </>
      )}
      {batches.length > 0 && (
        <Card title="Importações" className="mt-6">
          <Table head={["Arquivo", "Data", "Linhas", "Importadas", "Duplicadas", "Rejeitadas", ""]}>
            {batches.map((b) => (
              <tr key={b.id}>
                <td className={td}>{b.filename}</td><td className={td}>{dateTime(b.importedAt)}</td><td className={td}>{b.totalRows}</td>
                <td className={td}>{b.accepted}</td><td className={td}>{b.duplicates}</td><td className={td}>{b.rejected}</td>
                <td className={td}><form action={deleteBatch}><input type="hidden" name="id" value={b.id} /><button className="text-xs text-mute hover:text-bad">desfazer</button></form></td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
