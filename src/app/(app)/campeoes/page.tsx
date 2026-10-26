import Link from "next/link";
import { analyzeAll } from "@/lib/analysis";
import { getSettings } from "@/lib/settings";
import { requireCtx } from "@/lib/auth";
import { MIN_CONFIDENCE } from "@/lib/hunter-score";
import { TREND_LABELS, type TrendClass } from "@/lib/trends";
import { Card, PageHeader, PeriodTabs, Table, td, TrendBadge, RecBadge, DemoTag, Empty, EstTag, Field, input, btnGhost } from "@/components/ui";
import { brl, int, pct, periodParam, signedPct, str } from "@/lib/format";
import type { SP } from "@/components/Flash";

export default async function Campeoes({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const periodo = periodParam(sp.periodo);
  const ctx = await requireCtx();
  const [all, settings] = await Promise.all([analyzeAll(ctx.accountId, periodo), getSettings(ctx.accountId)]);
  const f = { cat: str(sp.cat), classe: str(sp.classe), minScore: Number(str(sp.score)) || 0, maxSat: Number(str(sp.sat)) || 100, minMargin: Number(str(sp.margem)) || 0, minGrowth: str(sp.cresc) === "" ? null : Number(str(sp.cresc)), min: Number(str(sp.min)) || 0, max: Number(str(sp.max)) || Infinity, soConfirmados: str(sp.conf) === "1" };
  const cats = [...new Set(all.map((a) => a.product.category).filter(Boolean))].sort();
  const rows = all
    .filter((a) => (!f.cat || a.product.category === f.cat) && (!f.classe || a.trend.classification === f.classe))
    .filter((a) => (a.score.score ?? 0) >= f.minScore && (a.competition.saturation ?? 0) <= f.maxSat)
    .filter((a) => f.minMargin === 0 || (a.calc && a.calc.contributionPct * 100 >= f.minMargin))
    .filter((a) => f.minGrowth === null || (a.trend.growthPeriod !== null && a.trend.growthPeriod * 100 >= f.minGrowth))
    .filter((a) => (a.salePrice ?? 0) >= f.min && (a.salePrice ?? 0) <= f.max)
    .filter((a) => !f.soConfirmados || a.score.confirmed)
    .sort((a, b) => (b.score.confirmed ? 1 : 0) - (a.score.confirmed ? 1 : 0) || (b.score.score ?? -1) - (a.score.score ?? -1))
    .slice(0, 100);
  const w = settings.weights;
  const extra = Object.entries(sp).filter(([k]) => k !== "periodo").map(([k, v]) => `&${k}=${encodeURIComponent(str(v))}`).join("");

  return (
    <>
      <PageHeader title="Produtos Campeões" subtitle={`Ranking dos 100 produtos com maior Hunter Score no período. Pesos: demanda ${w.demand}, crescimento ${w.growth}, concorrência ${w.competition}, margem ${w.margin}, fornecedores ${w.suppliers} (ajuste em Configurações).`}>
        <PeriodTabs base="/campeoes" current={periodo} extra={extra} />
      </PageHeader>
      <Card>
        <form className="grid gap-3 md:grid-cols-9">
          <input type="hidden" name="periodo" value={periodo} />
          <Field label="Categoria"><select name="cat" defaultValue={f.cat} className={input}><option value="">Todas</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Tendência"><select name="classe" defaultValue={f.classe} className={input}><option value="">Todas</option>{(Object.keys(TREND_LABELS) as TrendClass[]).map((c) => <option key={c} value={c}>{TREND_LABELS[c]}</option>)}</select></Field>
          <Field label="Score mín."><input name="score" defaultValue={str(sp.score)} className={input} /></Field>
          <Field label="Saturação máx."><input name="sat" defaultValue={str(sp.sat)} className={input} /></Field>
          <Field label="Margem mín. %"><input name="margem" defaultValue={str(sp.margem)} className={input} /></Field>
          <Field label="Crescim. mín. %"><input name="cresc" defaultValue={str(sp.cresc)} className={input} /></Field>
          <Field label="Preço mín."><input name="min" defaultValue={str(sp.min)} className={input} /></Field>
          <Field label="Preço máx."><input name="max" defaultValue={str(sp.max)} className={input} /></Field>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-xs text-mute"><input type="checkbox" name="conf" value="1" defaultChecked={f.soConfirmados} /> só confirmados</label>
            <button className={btnGhost}>Filtrar</button>
          </div>
        </form>
      </Card>
      <div className="mt-6">
        {rows.length === 0 ? (
          <Empty title="Nenhum produto atende aos filtros">Cadastre produtos e colete dados, ou ative o Modo DEMO para ver um exemplo.</Empty>
        ) : (
          <Table head={["#", "Produto", "Hunter Score", "Confiança", `Vendas ${periodo}d`, "Crescim.", "Tendência", "Saturação", "Preço ref.", "Margem", "Investimento", "Recomendação"]}>
            {rows.map((a, i) => (
              <tr key={a.product.id} className="hover:bg-panel2/40">
                <td className={`${td} text-mute`}>{i + 1}</td>
                <td className={`${td} max-w-xs`}>
                  <Link href={`/produtos/${a.product.id}?periodo=${periodo}`} className="font-medium hover:text-brand-blue">{a.product.name}</Link> <DemoTag show={a.product.isDemo} />
                  <details className="mt-1 text-xs text-mute">
                    <summary className="cursor-pointer text-brand-blue/80">como foi calculado</summary>
                    <ul className="mt-1 space-y-0.5">{a.score.justification.map((j, k) => <li key={k}>{j}</li>)}</ul>
                    {a.score.risks.length > 0 && <div className="mt-1 text-red-300">Riscos: {a.score.risks.join(" · ")}</div>}
                  </details>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded bg-panel2"><div className="h-full bg-gradient-to-r from-brand-blue to-brand-green" style={{ width: `${a.score.score ?? 0}%` }} /></div>
                    <span className={`font-semibold ${a.score.confirmed ? "" : "text-amber-300"}`} title={a.score.confirmed ? "" : "provisório: dados insuficientes"}>{a.score.score === null ? "—" : a.score.score.toFixed(0)}{!a.score.confirmed && "*"}</span>
                  </div>
                </td>
                <td className={td}><span className={a.score.confidence >= MIN_CONFIDENCE ? "text-green-400" : "text-amber-400"}>{pct(a.score.confidence, 0)}</span></td>
                <td className={td}>{a.trend.salesPeriod ? <>{int(a.trend.salesPeriod.value)} <EstTag observed={a.trend.salesPeriod.observed} confidence={a.trend.salesPeriod.confidence} /></> : "—"}</td>
                <td className={td}>{signedPct(a.trend.growthPeriod)}</td>
                <td className={td}><TrendBadge c={a.trend.classification} /></td>
                <td className={td}>{a.competition.saturation === null ? "—" : a.competition.saturation.toFixed(0)}</td>
                <td className={td}>{brl(a.salePrice)}</td>
                <td className={td}>{pct(a.calc?.contributionPct)}</td>
                <td className={td}>{brl(a.investment)}</td>
                <td className={td}><RecBadge rec={a.score.recommendation} confirmed={a.score.confirmed} /></td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-xs text-mute">* Recomendação marcada com asterisco = dados insuficientes (confiança &lt; {pct(MIN_CONFIDENCE, 0)} ou sem demanda/margem): não é oportunidade confirmada. Recomendações são apoio à decisão, não garantia de vendas.</p>
      </div>
    </>
  );
}
