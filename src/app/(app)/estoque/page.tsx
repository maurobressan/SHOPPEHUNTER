import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { restockPlan, type RestockStatus } from "@/lib/restock";
import { saveSkuStock, deleteSkuStock } from "@/app/actions/app";
import { Card, PageHeader, Stat, Table, td, Empty, Badge, input, btnPrimary } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";
import { date, int } from "@/lib/format";

export const metadata = { title: "Estoque e reposição" };

const STATUS: Record<RestockStatus, { label: string; tone: "red" | "amber" | "green" | "default" | "blue" }> = {
  sem_estoque: { label: "Sem estoque", tone: "red" },
  pedir_agora: { label: "Pedir agora", tone: "red" },
  pedir_em_breve: { label: "Pedir nesta semana", tone: "amber" },
  ok: { label: "Em dia", tone: "green" },
  sem_contagem: { label: "Informe o estoque", tone: "blue" },
  sem_vendas: { label: "Sem vendas no período", tone: "default" },
};

const SAFETY = 7;
const COVER = 30;

export default async function Estoque({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const [lines, stocks] = await Promise.all([
    prisma.orderLine.findMany({ where: { accountId: ctx.accountId }, select: { sku: true, productName: true, orderDate: true, status: true, quantity: true } }),
    prisma.skuStock.findMany({ where: { accountId: ctx.accountId } }),
  ]);
  const plan = restockPlan(lines, Object.fromEntries(stocks.map((x) => [x.sku, { quantity: x.quantity, leadTimeDays: x.leadTimeDays, countedAt: x.countedAt }])), { safetyDays: SAFETY, coverDays: COVER });
  const urgent = plan.rows.filter((r) => r.status === "sem_estoque" || r.status === "pedir_agora").length;
  const soon = plan.rows.filter((r) => r.status === "pedir_em_breve").length;
  const missing = plan.rows.filter((r) => r.status === "sem_contagem" && r.perDay > 0).length;
  const staleDays = plan.windowTo ? Math.floor((Date.now() - plan.windowTo.getTime()) / 86400000) : null;

  return (
    <>
      <PageHeader title="Estoque e reposição" subtitle="Informe quanto tem de cada SKU e o prazo do fornecedor: o Hunter usa o ritmo das suas vendas para dizer quando o estoque acaba e até quando pedir." />
      <Flash sp={sp} />
      {!lines.length ? (
        <Empty title="Importe suas vendas primeiro">
          O ritmo de vendas vem da planilha do Centro do Vendedor. <Link href="/vendas#importar" className="font-semibold text-brand-blue">Importar planilha</Link>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Pedir agora" value={urgent} tone={urgent ? "red" : "default"} hint="sem estoque ou passou do prazo de pedir" />
            <Stat label="Pedir nesta semana" value={soon} tone={soon ? "amber" : "default"} />
            <Stat label="SKUs sem contagem" value={missing} tone={missing ? "blue" : "default"} hint="com vendas, mas sem estoque informado" />
            <Stat label="Base do ritmo de vendas" value={<span className="text-base">{date(plan.windowFrom)} a {date(plan.windowTo)}</span>} hint={staleDays !== null && staleDays > 7 ? `última planilha tem ${staleDays} dias: importe a mais recente` : "30 dias até o pedido mais recente importado"} />
          </div>

          <Card title="SKUs" className="mt-6">
            <Table head={["SKU / produto", "Vendas/dia", "Estoque", "Prazo fornecedor", "Acaba em", "Pedir até", "Sugestão de compra", "Situação"]}>
              {plan.rows.map((r) => (
                <tr key={r.sku}>
                  <td className={`${td} max-w-xs`}><div className="font-medium">{r.sku}</div><div className="text-xs text-mute">{r.productName}</div></td>
                  <td className={td}>{r.perDay ? r.perDay.toFixed(1).replace(".", ",") : "0"}<div className="text-xs text-mute">{int(r.unitsWindow)} em 30d</div></td>
                  <td className={td} colSpan={2}>
                    <form action={saveSkuStock} className="flex items-center gap-1.5">
                      <input type="hidden" name="sku" value={r.sku} />
                      <input name="quantity" defaultValue={r.stock?.quantity ?? ""} placeholder="qtd" aria-label="Quantidade em estoque" className={`${input} w-[4.75rem] px-2 py-1`} />
                      <input name="leadTimeDays" defaultValue={r.stock?.leadTimeDays ?? 15} aria-label="Prazo do fornecedor em dias" className={`${input} w-14 px-2 py-1`} />
                      <span className="text-xs text-mute">dias</span>
                      <button className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-blue hover:bg-brand-blue/10">salvar</button>
                    </form>
                    {r.stock && (
                      <div className="mt-1 text-xs text-mute">
                        contado em {date(r.stock.countedAt)}{r.soldSinceCount ? ` · −${r.soldSinceCount} vendidos depois` : ""} · <b className="text-ink">≈ {int(r.estimatedNow)} agora</b>
                      </div>
                    )}
                  </td>
                  <td className={td}>{r.runsOutAt ? date(r.runsOutAt) : "—"}</td>
                  <td className={`${td} font-semibold ${r.status === "pedir_agora" || r.status === "sem_estoque" ? "text-bad" : ""}`}>{r.orderBy ? date(r.orderBy) : "—"}</td>
                  <td className={td}>{r.suggestedQty !== null ? `${int(r.suggestedQty)} un.` : "—"}</td>
                  <td className={td}>
                    <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                    {r.stock && <form action={deleteSkuStock} className="mt-1"><input type="hidden" name="sku" value={r.sku} /><button className="text-xs text-mute hover:text-bad">limpar</button></form>}
                  </td>
                </tr>
              ))}
            </Table>
            <p className="mt-4 text-xs leading-relaxed text-mute">
              Como calculamos: vendas/dia = unidades não canceladas nos 30 dias até o pedido mais recente importado. O estoque de agora desconta o que foi vendido depois da sua contagem (pelas planilhas importadas).
              “Pedir até” = dia em que o estoque acaba − prazo do fornecedor − {SAFETY} dias de segurança. A sugestão cobre o prazo do fornecedor + {COVER} dias de venda depois que a mercadoria chegar, no ritmo atual. Picos de venda (datas comemorativas) não estão previstos.
            </p>
          </Card>
        </>
      )}
      <div className="mt-6 flex justify-end"><Link href="/vendas#importar" className={btnPrimary}>Importar planilha mais recente</Link></div>
    </>
  );
}
