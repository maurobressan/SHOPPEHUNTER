import Link from "next/link";
import { prisma } from "@/lib/db";
import { scope } from "@/lib/settings";
import { requireCtx } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai-report";
import { generateAiReportAction, deleteReport } from "@/app/actions/app";
import { Card, PageHeader, Empty, Badge, Notice, btnPrimary, btnGhost, input, Field } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { Flash, type SP } from "@/components/Flash";
import { dateTime, str } from "@/lib/format";

export default async function Assistente({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const where = await scope(ctx.accountId);
  const [products, reports] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { updatedAt: "desc" }, select: { id: true, name: true } }),
    prisma.aiReport.findMany({ where: { product: where }, orderBy: { createdAt: "desc" }, take: 30, include: { product: { select: { name: true } } } }),
  ]);
  const current = reports.find((r) => r.id === str(sp.r)) ?? reports[0];
  const ai = aiConfigured() && ctx.limits.aiExternal;

  return (
    <>
      <PageHeader title="Assistente IA" subtitle="Relatório de oportunidade com evidências, fontes, datas e premissas. A IA nunca transforma ausência de dados em fatos." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card title="Nova análise">
            {products.length === 0 ? <p className="text-sm text-mute">Cadastre um produto primeiro.</p> : (
              <form action={generateAiReportAction} className="space-y-3">
                <Field label="Produto">
                  <select name="productId" className={input} defaultValue={str(sp.p) || products[0].id}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </Field>
                <Field label="Período"><select name="periodo" className={input} defaultValue="30">{[7, 15, 30, 60, 90].map((d) => <option key={d} value={d}>{d} dias</option>)}</select></Field>
                <div className="flex flex-col gap-2">
                  <button name="useAi" value="1" className={btnPrimary} disabled={!ai}>Analisar oportunidade com IA</button>
                  <button name="useAi" value="0" className={btnGhost}>Gerar relatório por regras (grátis)</button>
                </div>
              </form>
            )}
            {!ai && (
              <div className="mt-3">
                <Notice tone="amber">
                  {!aiConfigured() ? "IA externa não configurada no servidor." : <>Análise com IA externa disponível nos planos pagos. <Link className="underline" href="/assinatura">Ver planos</Link>.</>} O relatório por regras já traz as 10 seções com os dados reais.
                </Notice>
              </div>
            )}
          </Card>
          <Card title="Relatórios salvos">
            {reports.length === 0 ? <p className="text-sm text-mute">Nenhum relatório.</p> : (
              <ul className="space-y-1 text-sm">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Link href={`/assistente?r=${r.id}`} className={`block rounded-md px-2 py-1.5 ${current?.id === r.id ? "bg-panel2 text-ink" : "text-mute hover:text-ink"}`}>
                      {r.product.name}<div className="text-[11px]">{dateTime(r.createdAt)} · {r.engine}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card className="lg:col-span-2" title={current ? `Relatório — ${current.product.name}` : "Relatório"} actions={current && (
          <div className="flex items-center gap-2">
            <Badge tone={current.engine === "regras" ? "default" : "violet"}>{current.engine}{current.model ? ` · ${current.model}` : ""}</Badge>
            <form action={deleteReport}><input type="hidden" name="id" value={current.id} /><button className="text-xs text-mute hover:text-red-300">excluir</button></form>
          </div>
        )}>
          {current ? <Markdown text={current.content} /> : <Empty title="Selecione um produto e gere a análise" />}
        </Card>
      </div>
    </>
  );
}
