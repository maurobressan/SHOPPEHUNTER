import Link from "next/link";
import { notFound } from "next/navigation";
import { analyzeById, baseCalcInput as baseInput, feeOpts } from "@/lib/analysis";
import { salesInWindow } from "@/lib/trends";
import { DAY } from "@/lib/stats";
import { calculate } from "@/lib/calculator";
import { getActiveFeeSchedule, getSettings } from "@/lib/settings";
import { requireCtx } from "@/lib/auth";
import { affiliateConfig } from "@/lib/sources/shopee-affiliate";
import { updateProduct, deleteProduct, collectProduct, addManualSnapshot, generateAiReportAction } from "@/app/actions/app";
import { Card, PageHeader, PeriodTabs, Stat, TrendBadge, RecBadge, Table, td, Badge, EstTag, Field, input, btnPrimary, btnGhost, btnDanger, DemoTag, Notice } from "@/components/ui";
import { SalesPriceChart } from "@/components/charts";
import { Flash, type SP } from "@/components/Flash";
import { brl, date, dateTime, int, pct, periodParam, signedPct } from "@/lib/format";

export default async function ProdutoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const periodo = periodParam(sp.periodo);
  const ctx = await requireCtx();
  const a = await analyzeById(ctx.accountId, id, periodo);
  if (!a) notFound();
  const settings = await getSettings(ctx.accountId);
  const fee = await getActiveFeeSchedule(settings.sellerType);
  const canCollect = !!affiliateConfig() && ctx.limits.autoCollect;
  const p = a.product;
  const self = `/produtos/${id}?periodo=${periodo}`;
  const t = a.trend;
  const vols = [100, 300, 1000];

  return (
    <>
      <PageHeader title={p.name} subtitle={`${p.category || "Sem categoria"} · fontes: ${a.sources.join(", ") || "nenhuma"} · última coleta: ${dateTime(a.lastCollected)}`}>
        <DemoTag show={p.isDemo} />
        <Link href={`/produtos/${id}/relatorio?periodo=${periodo}`} className={btnGhost}>Relatório para imprimir/PDF</Link>
        <PeriodTabs base={`/produtos/${id}`} current={periodo} />
      </PageHeader>
      <Flash sp={sp} />
      {p.isDemo && <div className="mb-5"><Notice tone="amber">Produto de demonstração: todos os dados são fictícios.</Notice></div>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label={a.score.confirmed ? "Hunter Score" : "Hunter Score (provisório)"}
          value={a.score.score === null ? "—" : a.score.score.toFixed(0)}
          tone={a.score.confirmed ? "green" : "amber"}
          hint={`confiança ${pct(a.score.confidence, 0)}${a.score.confirmed ? "" : " — dados insuficientes"}`}
        />
        <Stat label={`Vendas ${periodo}d`} value={t.salesPeriod ? int(t.salesPeriod.value) : "—"} hint={t.salesPeriod ? (t.salesPeriod.observed ? "medido entre snapshots" : `estimativa (${pct(t.salesPeriod.confidence, 0)} cobertura)`) : "sem histórico suficiente"} />
        <Stat label="Crescimento" value={signedPct(t.growthPeriod)} tone={t.growthPeriod !== null && t.growthPeriod >= 0 ? "green" : "red"} hint={`vs ${periodo}d anteriores`} />
        <Stat label="Saturação" value={a.competition.saturation === null ? "—" : a.competition.saturation.toFixed(0)} hint={`${a.competition.observedListings} anúncios observados`} />
        <Stat label="Margem estimada" value={pct(a.calc?.contributionPct)} hint={a.calc ? `${brl(a.calc.contributionMargin)}/venda` : "cadastre cotação"} tone="blue" />
        <Stat label="Investimento inicial" value={brl(a.investment)} hint={a.chosenQuote ? `${a.chosenQuote.moq ?? settings.testLotUnits} un.` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Histórico de vendas e preço" className="lg:col-span-2" actions={<TrendBadge c={t.classification} />}>
          <SalesPriceChart data={a.daily} />
          <p className="mt-2 text-xs text-mute">{t.reasons.join(" ")} {t.seasonality}</p>
        </Card>
        <Card title="Recomendação" actions={<RecBadge rec={a.score.recommendation} confirmed={a.score.confirmed} />}>
          <ul className="space-y-1 text-xs text-mute">{a.score.justification.map((j) => <li key={j}>{j}</li>)}</ul>
          {a.score.advantages.length > 0 && <div className="mt-3 text-xs"><div className="mb-1 font-semibold text-ok">Vantagens</div>{a.score.advantages.map((x) => <div key={x}>+ {x}</div>)}</div>}
          {a.score.risks.length > 0 && <div className="mt-3 text-xs"><div className="mb-1 font-semibold text-bad">Riscos</div>{a.score.risks.map((x) => <div key={x}>− {x}</div>)}</div>}
          <p className="mt-3 text-[11px] text-mute">Apoio à decisão — não é garantia de vendas.</p>
          <form action={generateAiReportAction} className="mt-4 flex gap-2">
            <input type="hidden" name="productId" value={id} /><input type="hidden" name="periodo" value={periodo} /><input type="hidden" name="useAi" value="1" />
            <button className={btnPrimary}>Analisar oportunidade com IA</button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Lucro com o fornecedor escolhido" actions={<Link href={`/calculadora?p=${id}`} className="text-xs text-brand-blue">abrir calculadora →</Link>}>
          {a.calc && a.salePrice && a.landedCost !== null ? (
            <>
              <div className="mb-3 text-sm text-mute">
                Venda a {brl(a.salePrice)} ({a.salePriceSource}) · custo {brl(a.landedCost)} ({a.chosenQuote?.supplier.name}) · tarifas Shopee {brl(a.calc.fees.total)} ({fee.name})
              </div>
              <Table head={["Vendas/mês", "Faturamento", "Margem de contribuição", "Lucro após fixas", "Estoque"]}>
                {vols.map((v) => {
                  const x = calculate({ ...baseInput(settings, a.salePrice!, a.landedCost!), monthlyVolume: v }, fee.rules, feeOpts(settings));
                  return (
                    <tr key={v}>
                      <td className={td}>{v.toLocaleString("pt-BR")}</td>
                      <td className={td}>{brl(x.revenueAfterDiscount * v)}</td>
                      <td className={td}>{brl(x.monthlyContribution)}</td>
                      <td className={`${td} font-semibold ${x.monthlyNetProfit >= 0 ? "text-ok" : "text-bad"}`}>{brl(x.monthlyNetProfit)}</td>
                      <td className={td}>{brl((x.productCost + settings.packagingCost) * v)}</td>
                    </tr>
                  );
                })}
              </Table>
              <p className="mt-2 text-xs text-mute">Lucro por unidade: {brl(a.calc.contributionMargin)} ({pct(a.calc.contributionPct)}). Volumes são hipóteses, não previsão.</p>
              {a.lot && (
                <div className="mt-3 rounded-lg bg-panel2 p-3 text-xs text-mute">
                  <b className="text-ink">Lote de {a.chosenQuote?.moq ?? settings.testLotUnits} un.</b> ({brl(a.lot.investment)}): vendendo {a.lot.hypothesis}/mês
                  <span title="Hipótese: capturar 5% das vendas mensais observadas nos concorrentes."> (hipótese de 5% do mercado observado)</span>, o lote esgota em {a.lot.daysToSellOut ?? "—"} dias e o dinheiro
                  volta em {a.lot.paybackDay === null ? "mais de " + a.lot.series.length + " dias" : `${a.lot.paybackDay} dias`} (repasse de {settings.payoutDelayDays} dias). Lucro do lote: <b className={a.lot.profit >= 0 ? "text-ok" : "text-bad"}>{brl(a.lot.profit)}</b>.
                  <Link href={`/calculadora?p=${id}`} className="ml-1 text-brand-blue">simular outro ritmo →</Link>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-mute">Para calcular, é preciso um preço de venda (preço-alvo ou concorrentes) e uma cotação com preço. <Link className="text-brand-blue" href={`/fornecedores?p=${id}`}>Registrar cotação</Link></p>
          )}
        </Card>
        <Card title="Concorrência" actions={<Link href={`/concorrencia?p=${id}`} className="text-xs text-brand-blue">análise completa →</Link>}>
          {a.competition.price ? (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><div className="text-xs text-mute">Mínimo</div>{brl(a.competition.price.min)}</div>
              <div><div className="text-xs text-mute">Mediana</div>{brl(a.competition.price.median)}</div>
              <div><div className="text-xs text-mute">Máximo</div>{brl(a.competition.price.max)}</div>
            </div>
          ) : <p className="text-sm text-mute">Sem anúncios concorrentes vinculados.</p>}
          <ul className="mt-3 space-y-1 text-xs text-ink/80">{a.competition.opportunities.slice(0, 4).map((o) => <li key={o}>• {o}</li>)}</ul>
          <div className="mt-3 text-xs text-mute">Fornecedores: {p.quotes.length} cotação(ões) · <Link className="text-brand-blue" href={`/fornecedores?p=${id}`}>comparar</Link></div>
        </Card>
      </div>

      <Card title="Anúncios monitorados e snapshots" className="mt-6">
        {p.listings.length === 0 ? (
          <p className="text-sm text-mute">Nenhum anúncio vinculado. <Link className="text-brand-blue" href={`/explorar?q=${encodeURIComponent(p.keywords.split(",")[0] || p.name)}`}>Explorar e vincular</Link></p>
        ) : (
          <Table head={["Anúncio", "Loja", "Preço atual", "Vendas acumuladas", `Vendas ${periodo}d`, "Snapshots", "Desde", "Registrar observação manual"]}>
            {p.listings.map((l) => {
              const last = l.snapshots[l.snapshots.length - 1];
              return (
                <tr key={l.id}>
                  <td className={`${td} max-w-xs`}>{l.url ? <a href={l.url} target="_blank" rel="noreferrer" className="hover:text-brand-blue">{l.title}</a> : l.title}</td>
                  <td className={td}>{l.shopName || "—"}</td>
                  <td className={td}>{brl(last?.price)}</td>
                  <td className={td}>{int(last?.salesCumulative)}</td>
                  <td className={td}><ListingPeriod snaps={l.snapshots} days={periodo} /></td>
                  <td className={td}>{l.snapshots.length} <span className="text-xs text-mute">({[...new Set(l.snapshots.map((s) => s.source))].join(", ")})</span></td>
                  <td className={td}>{date(l.firstSeenAt)}</td>
                  <td className={td}>
                    <form action={addManualSnapshot} className="flex gap-1">
                      <input type="hidden" name="listingId" value={l.id} /><input type="hidden" name="_back" value={self} />
                      <input name="price" placeholder="preço" className={`${input} w-20 py-1`} />
                      <input name="salesCumulative" placeholder="vendidos" className={`${input} w-24 py-1`} />
                      <button className="text-xs text-brand-blue">salvar</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Editar produto" className="lg:col-span-2">
          <form action={updateProduct} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="id" value={id} />
            <Field label="Nome"><input name="name" defaultValue={p.name} className={input} /></Field>
            <Field label="Palavras-chave (coleta)"><input name="keywords" defaultValue={p.keywords} className={input} /></Field>
            <Field label="Categoria"><input name="category" defaultValue={p.category} className={input} /></Field>
            <Field label="Status">
              <select name="status" defaultValue={p.status} className={input}><option value="monitorando">Monitorando</option><option value="testando">Testando</option><option value="vendendo">Vendendo</option><option value="descartado">Descartado</option></select>
            </Field>
            <Field label="Preço-alvo de venda (R$)"><input name="targetPrice" defaultValue={p.targetPrice ?? ""} className={input} /></Field>
            <Field label="Observações"><input name="notes" defaultValue={p.notes} className={input} /></Field>
            <div className="flex gap-2 md:col-span-3"><button className={btnGhost}>Salvar alterações</button></div>
          </form>
        </Card>
        <Card title="Ações">
          <form action={collectProduct}><input type="hidden" name="id" value={id} /><button className={`${btnPrimary} w-full`} disabled={!canCollect}>Coletar agora (API Shopee)</button></form>
          {!canCollect && <p className="mt-2 text-xs text-mute">{affiliateConfig() ? "Coleta pela API nos planos pagos." : "API de Afiliados não configurada no servidor."} Use a extensão ou o registro manual de snapshots.</p>}
          <form action={deleteProduct} className="mt-3"><input type="hidden" name="id" value={id} /><button className={`${btnDanger} w-full`}>Excluir produto</button></form>
          <div className="mt-3 flex flex-wrap gap-1">{a.similarGroups.length > 0 && <Badge tone="violet">{a.similarGroups.length} grupo(s) de anúncios semelhantes</Badge>}</div>
        </Card>
      </div>
    </>
  );
}

function ListingPeriod({ snaps, days }: { snaps: { referenceDate: Date; price: number | null; salesCumulative: number | null; ratingCount: number | null; ratingStar: number | null }[]; days: number }) {
  const now = new Date();
  const w = salesInWindow(snaps.map((x) => ({ t: x.referenceDate, price: x.price, salesCumulative: x.salesCumulative, ratingCount: x.ratingCount, ratingStar: x.ratingStar })), new Date(now.getTime() - days * DAY), now);
  return w ? <>{int(w.value)} <EstTag observed={w.observed} confidence={w.confidence} /></> : <span className="text-xs text-mute">insuficiente</span>;
}
