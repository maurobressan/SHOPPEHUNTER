import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { scope } from "@/lib/settings";
import { analyzeById } from "@/lib/analysis";
import { PageHeader, Card, Empty, TrendBadge, RecBadge, DemoTag, btnPrimary, EstTag } from "@/components/ui";
import { brl, int, pct, periodParam, signedPct } from "@/lib/format";
import type { SP } from "@/components/Flash";

export const metadata = { title: "Comparar Produtos" };

export default async function Comparar({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const periodo = periodParam(sp.periodo);
  const products = await prisma.product.findMany({ where: { ...(await scope(ctx.accountId)), status: { not: "descartado" } }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });
  const ids = (Array.isArray(sp.p) ? sp.p : sp.p ? [sp.p] : []).slice(0, 4);
  const items = (await Promise.all(ids.map((id) => analyzeById(ctx.accountId, id, periodo)))).filter((x): x is NonNullable<typeof x> => !!x);
  const best = (vals: (number | null)[], higher = true) => {
    const ok = vals.filter((v): v is number => v !== null);
    if (ok.length < 2) return null;
    return higher ? Math.max(...ok) : Math.min(...ok);
  };
  type Row = { label: string; get: (a: (typeof items)[number]) => React.ReactNode; num?: (a: (typeof items)[number]) => number | null; higher?: boolean };
  const rows: Row[] = [
    { label: "Hunter Score", get: (a) => (a.score.score === null ? "—" : `${a.score.score.toFixed(0)}${a.score.confirmed ? "" : "*"}`), num: (a) => a.score.score },
    { label: "Confiança dos dados", get: (a) => pct(a.score.confidence, 0), num: (a) => a.score.confidence },
    { label: "Recomendação", get: (a) => <RecBadge rec={a.score.recommendation} confirmed={a.score.confirmed} /> },
    { label: "Tendência", get: (a) => <TrendBadge c={a.trend.classification} /> },
    { label: `Vendas ${periodo}d (mercado)`, get: (a) => (a.trend.salesPeriod ? <>{int(a.trend.salesPeriod.value)} <EstTag observed={a.trend.salesPeriod.observed} confidence={a.trend.salesPeriod.confidence} /></> : "—"), num: (a) => a.trend.salesPeriod?.value ?? null },
    { label: "Crescimento", get: (a) => signedPct(a.trend.growthPeriod), num: (a) => a.trend.growthPeriod },
    { label: "Saturação (menor é melhor)", get: (a) => (a.competition.saturation === null ? "—" : a.competition.saturation.toFixed(0)), num: (a) => a.competition.saturation, higher: false },
    { label: "Preço de referência", get: (a) => brl(a.salePrice) },
    { label: "Custo com frete", get: (a) => brl(a.landedCost) },
    { label: "Tarifas Shopee", get: (a) => brl(a.calc?.fees.total) },
    { label: "Margem por venda", get: (a) => brl(a.calc?.contributionMargin), num: (a) => a.calc?.contributionMargin ?? null },
    { label: "Margem %", get: (a) => pct(a.calc?.contributionPct), num: (a) => a.calc?.contributionPct ?? null },
    { label: "ROI por venda", get: (a) => pct(a.calc?.roi), num: (a) => a.calc?.roi ?? null },
    { label: "Investimento inicial", get: (a) => brl(a.investment), num: (a) => a.investment, higher: false },
    { label: "Retorno do lote (dias)", get: (a) => (a.lot?.paybackDay ?? "—"), num: (a) => a.lot?.paybackDay ?? null, higher: false },
    { label: "Fornecedores", get: (a) => a.product.quotes.length },
  ];

  return (
    <>
      <PageHeader title="Comparar Produtos" subtitle="Lado a lado: demanda, concorrência, margem e investimento de até 4 produtos. Destaque verde = melhor valor da linha." />
      <Card>
        <form className="flex flex-wrap items-end gap-3">
          {[0, 1, 2, 3].map((i) => (
            <select key={i} name="p" defaultValue={ids[i] ?? ""} className="min-w-52 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink">
              <option value="">— produto {i + 1} —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ))}
          <select name="periodo" defaultValue={periodo} className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink">{[7, 15, 30, 60, 90].map((d) => <option key={d} value={d}>{d} dias</option>)}</select>
          <button className={btnPrimary}>Comparar</button>
        </form>
      </Card>
      <div className="mt-6">
        {items.length < 2 ? (
          <Empty title="Escolha pelo menos 2 produtos" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-panel2 text-left text-xs uppercase text-mute">
                <tr>
                  <th className="px-3 py-2.5">Indicador</th>
                  {items.map((a) => <th key={a.product.id} className="px-3 py-2.5"><Link href={`/produtos/${a.product.id}`} className="normal-case text-ink hover:text-brand-blue">{a.product.name}</Link> <DemoTag show={a.product.isDemo} /></th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const b = r.num ? best(items.map(r.num), r.higher ?? true) : null;
                  return (
                    <tr key={r.label}>
                      <td className="px-3 py-2.5 text-mute">{r.label}</td>
                      {items.map((a) => <td key={a.product.id} className={`px-3 py-2.5 ${b !== null && r.num?.(a) === b ? "font-semibold text-green-400" : ""}`}>{r.get(a)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-mute">* score provisório (dados insuficientes). Retorno do lote usa a hipótese de capturar 5% das vendas observadas do mercado.</p>
      </div>
    </>
  );
}
