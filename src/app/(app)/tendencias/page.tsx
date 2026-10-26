import Link from "next/link";
import { analyzeAll } from "@/lib/analysis";
import { requireCtx } from "@/lib/auth";
import { TREND_CRITERIA, TREND_LABELS, type TrendClass } from "@/lib/trends";
import { Card, PageHeader, PeriodTabs, Table, td, TrendBadge, DemoTag, Empty, Stat, EstTag, Badge } from "@/components/ui";
import { SalesPriceChart, GrowthBars } from "@/components/charts";
import { int, periodParam, signedPct, str } from "@/lib/format";
import type { SP } from "@/components/Flash";

export default async function Tendencias({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const periodo = periodParam(sp.periodo);
  const ctx = await requireCtx();
  const all = await analyzeAll(ctx.accountId, periodo);
  const order: TrendClass[] = ["explosivo", "crescimento", "estavel", "saturado", "queda", "insuficiente"];
  const rows = [...all].sort((a, b) => order.indexOf(a.trend.classification) - order.indexOf(b.trend.classification) || (b.trend.growthPeriod ?? -9) - (a.trend.growthPeriod ?? -9));
  const sel = all.find((a) => a.product.id === str(sp.p)) ?? rows.find((a) => a.trend.classification !== "insuficiente") ?? rows[0];
  const growthData = all.filter((a) => a.trend.growthPeriod !== null).map((a) => ({ name: a.product.name.replace("[DEMO] ", "").slice(0, 32), value: a.trend.growthPeriod as number })).sort((a, b) => b.value - a.value).slice(0, 15);
  const C = TREND_CRITERIA;

  return (
    <>
      <PageHeader title="Radar de Tendências" subtitle="Produtos que estão acelerando antes de saturar. Classificações baseadas em critérios mensuráveis (abaixo).">
        <PeriodTabs base="/tendencias" current={periodo} />
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {order.map((c) => <Stat key={c} label={TREND_LABELS[c].replace("Produto ", "")} value={all.filter((a) => a.trend.classification === c).length} />)}
      </div>
      {all.length === 0 ? (
        <div className="mt-6"><Empty title="Sem produtos monitorados">Cadastre produtos e colete snapshots diariamente para formar o histórico.</Empty></div>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card title={sel ? `Histórico — ${sel.product.name}` : "Histórico"}>
              {sel && <SalesPriceChart data={sel.daily} />}
              <p className="mt-2 text-xs text-mute">Vendas/dia derivadas da variação das vendas acumuladas entre snapshots. Dias sem cobertura ficam vazios.</p>
            </Card>
            <Card title={`Crescimento de vendas (${periodo}d vs ${periodo}d anteriores)`}>
              <GrowthBars data={growthData} />
            </Card>
          </div>
          <div className="mt-6">
            <Table head={["Produto", "Classe", `Vendas ${periodo}d`, "Cresc. período", "Cresc. 7d", "Cresc. 30d", "Aceleração", "Preço", "Avaliações", "Novos concorrentes", "Fundamento"]}>
              {rows.map((a) => (
                <tr key={a.product.id} className={`hover:bg-panel2/40 ${sel?.product.id === a.product.id ? "bg-panel2/60" : ""}`}>
                  <td className={`${td} max-w-[220px]`}>
                    <Link href={`/tendencias?periodo=${periodo}&p=${a.product.id}`} className="font-medium hover:text-brand-blue">{a.product.name}</Link> <DemoTag show={a.product.isDemo} />
                    {a.trend.spike && <Badge tone="amber">possível pico</Badge>}
                  </td>
                  <td className={td}><TrendBadge c={a.trend.classification} /></td>
                  <td className={td}>{a.trend.salesPeriod ? <>{int(a.trend.salesPeriod.value)} <EstTag observed={a.trend.salesPeriod.observed} confidence={a.trend.salesPeriod.confidence} /></> : "—"}</td>
                  <td className={td}>{signedPct(a.trend.growthPeriod)}</td>
                  <td className={td}>{signedPct(a.trend.growth7)}</td>
                  <td className={td}>{signedPct(a.trend.growth30)}</td>
                  <td className={td}>{signedPct(a.trend.acceleration)}</td>
                  <td className={td}>{signedPct(a.trend.priceChange)}</td>
                  <td className={td}>{signedPct(a.trend.ratingCountGrowth)}</td>
                  <td className={td}>{a.trend.newCompetitors ?? "—"}</td>
                  <td className={`${td} max-w-xs text-xs text-mute`}>{a.trend.reasons.join(" ")}</td>
                </tr>
              ))}
            </Table>
          </div>
        </>
      )}
      <Card title="Critérios de classificação" className="mt-6">
        <ul className="grid gap-2 text-sm text-mute md:grid-cols-2">
          <li><TrendBadge c="insuficiente" /> menos de {C.minSpanDays} dias de histórico ou menos de {C.minSnapshots} snapshots.</li>
          <li><TrendBadge c="explosivo" /> vendas 7d ≥ +{C.explosivo.growth7 * 100}% vs 7d anteriores, ritmo 7d ≥ {C.explosivo.acceleration * 100}% acima do ritmo 30d e ≥ {C.explosivo.minSales7} vendas em 7d.</li>
          <li><TrendBadge c="queda" /> vendas 30d ≤ {C.queda.growth30 * 100}% vs 30d anteriores.</li>
          <li><TrendBadge c="saturado" /> saturação de concorrência ≥ {C.saturado.saturation} e preço mediano caindo ≥ {Math.abs(C.saturado.priceChange * 100)}% no período.</li>
          <li><TrendBadge c="crescimento" /> vendas 30d ≥ +{C.crescimento.growth30 * 100}% vs 30d anteriores.</li>
          <li><TrendBadge c="estavel" /> variação entre {C.queda.growth30 * 100}% e +{C.crescimento.growth30 * 100}%.</li>
          <li className="md:col-span-2">Pico temporário: ritmo diário máximo maior que {C.spikeFactor}× a mediana no período. Sazonalidade: exige 365 dias de histórico próprio.</li>
        </ul>
      </Card>
    </>
  );
}
