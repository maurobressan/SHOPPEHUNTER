"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { calculate, solvePrice, priceTests, scenario, breakEvenPrice, DEFAULT_SCENARIOS, type CalcInput, type ScenarioAssumptions } from "@/lib/calculator";
import type { FeeRules } from "@/lib/fees";
import { Card, Field, input, Table, td, Badge, Notice } from "@/components/ui";
import { SimpleBars, CashChart } from "@/components/charts";
import { simulateLot } from "@/lib/cashflow";
import { brl, pct } from "@/lib/format";

const parse = (v: string) => {
  const s = v.trim();
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) ? n : 0;
};
const parseList = (v: string) => v.split(/[;\s]+/).map((x) => Number(x.replace(",", "."))).filter((x) => Number.isFinite(x) && x > 0);

function Num({ label, value, onChange, hint, suffix }: { label: string; value: number; onChange: (n: number) => void; hint?: string; suffix?: string }) {
  const [txt, setTxt] = useState(String(value).replace(".", ","));
  return (
    <Field label={`${label}${suffix ? ` (${suffix})` : ""}`} hint={hint}>
      <input
        inputMode="decimal"
        className={input}
        value={txt}
        onChange={(e) => {
          setTxt(e.target.value);
          onChange(parse(e.target.value));
        }}
      />
    </Field>
  );
}

const Row = ({ l, v, strong, neg, sub }: { l: string; v: string; strong?: boolean; neg?: boolean; sub?: string }) => (
  <div className={`flex justify-between gap-3 py-1.5 text-sm ${strong ? "border-t border-line pt-2 font-semibold" : ""}`}>
    <span className={strong ? "text-ink" : "text-mute"}>
      {l}
      {sub && <span className="ml-1 text-xs text-mute/70">{sub}</span>}
    </span>
    <span className={neg ? "text-red-300" : strong ? "text-ink" : "text-ink/90"}>{v}</span>
  </div>
);

export function Calculator(props: {
  initial: CalcInput;
  lot: { units: number; unitPrice: number; freight: number };
  payoutDelayDays: number;
  rules: { CNPJ: FeeRules; CPF: FeeRules };
  sources: { CNPJ: string; CPF: string };
  sellerType: "CNPJ" | "CPF";
  cpfHighVolume: boolean;
  taxRegime: string;
  context: { productName: string; competitorPrices: number[]; supplier: string | null; productId: string } | null;
  hasProducts: boolean;
}) {
  const [inp, setInp] = useState<CalcInput>(props.initial);
  const [seller, setSeller] = useState(props.sellerType);
  const [cpfHigh, setCpfHigh] = useState(props.cpfHighVolume);
  const [targetProfit, setTargetProfit] = useState(10);
  const [targetMargin, setTargetMargin] = useState(20);
  const [testPrices, setTestPrices] = useState("34,90 39,90 44,90 49,90");
  const [compPrices, setCompPrices] = useState(props.context?.competitorPrices.map((p) => p.toFixed(2).replace(".", ",")).join(" ") ?? "");
  const [kitDiscount, setKitDiscount] = useState(5);
  const [customKit, setCustomKit] = useState(4);
  const [scen, setScen] = useState<Record<string, ScenarioAssumptions>>(DEFAULT_SCENARIOS);
  const [volumes, setVolumes] = useState("100 300 1000");
  const [lotUnits, setLotUnits] = useState(props.lot.units);
  const [lotPrice, setLotPrice] = useState(props.lot.unitPrice);
  const [lotFreight, setLotFreight] = useState(props.lot.freight);
  const [lotOther, setLotOther] = useState(0);
  const [lotSales, setLotSales] = useState(Math.max(1, Math.round(props.lot.units / 2)));
  const [payout, setPayout] = useState(props.payoutDelayDays);
  const set = (k: keyof CalcInput) => (n: number) => setInp((s) => ({ ...s, [k]: n }));
  const rules = props.rules[seller];
  const opts = { cpfHighVolume: seller === "CPF" && cpfHigh };

  const r = useMemo(() => calculate(inp, rules, opts), [inp, rules, opts.cpfHighVolume]); // eslint-disable-line react-hooks/exhaustive-deps
  const be = useMemo(() => breakEvenPrice(inp, rules, opts), [inp, rules, opts.cpfHighVolume]); // eslint-disable-line react-hooks/exhaustive-deps
  const pProfit = solvePrice(inp, rules, { kind: "profit", value: targetProfit }, opts);
  const pMargin = solvePrice(inp, rules, { kind: "margin", value: targetMargin }, opts);
  const tests = priceTests(inp, parseList(testPrices), rules, parseList(compPrices), opts);
  const kitUnits = [1, 2, 3, 5, 10, Math.max(1, Math.round(customKit))];
  const kits = kitUnits.map((u, i) => {
    const price = Math.round(inp.price * u * (1 - (u > 1 ? kitDiscount / 100 : 0)) * 100) / 100;
    const res = calculate({ ...inp, price, unitsPerListing: u * inp.unitsPerListing }, rules, opts);
    const separate = calculate(inp, rules, opts).contributionMargin * u;
    return { u, price, res, separate, custom: i === kitUnits.length - 1 };
  });
  const vols = parseList(volumes).map(Math.round);
  // por venda entra: margem de contribuição + custo da mercadoria (a mercadoria já foi paga na compra do lote)
  const lotUnitsPerSale = Math.max(1, Math.floor(inp.unitsPerListing));
  const lotSim = simulateLot({
    lotUnits: Math.floor(lotUnits / lotUnitsPerSale),
    unitCost: lotPrice * lotUnitsPerSale,
    freight: lotFreight,
    otherUpfront: lotOther,
    netPerSale: r.contributionMargin + r.productCost,
    salesPerMonth: lotSales,
    payoutDelayDays: payout,
  });

  return (
    <div className="space-y-6">
      {props.context && (
        <Notice tone="blue">
          Pré-preenchido para <Link className="underline" href={`/produtos/${props.context.productId}`}>{props.context.productName}</Link>
          {props.context.supplier ? ` · custo: ${props.context.supplier}` : " · sem cotação com preço: custo de exemplo"} · {props.context.competitorPrices.length} preços de concorrentes carregados.
        </Notice>
      )}
      <div className="grid gap-6 xl:grid-cols-5">
        <Card title="Premissas" className="xl:col-span-3">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-mute">Vendedor:</span>
            {(["CNPJ", "CPF"] as const).map((s) => (
              <button key={s} onClick={() => setSeller(s)} className={`rounded-md border px-3 py-1 ${seller === s ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-line text-mute"}`}>{s}</button>
            ))}
            {seller === "CPF" && (
              <label className="flex items-center gap-2 text-mute"><input type="checkbox" checked={cpfHigh} onChange={(e) => setCpfHigh(e.target.checked)} /> mais de 450 pedidos em 90 dias (+R$ 3/item)</label>
            )}
            <a href={props.sources[seller]} target="_blank" rel="noreferrer" className="ml-auto text-xs text-brand-blue">fonte oficial das tarifas</a>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Num label="Preço de venda" suffix="R$" value={inp.price} onChange={set("price")} />
            <Num label="Unidades no anúncio" value={inp.unitsPerListing} onChange={set("unitsPerListing")} hint="1 = unitário" />
            <Num label="Custo por unidade" suffix="R$" value={inp.unitCost} onChange={set("unitCost")} hint="fornecedor + frete rateado" />
            <Num label="Embalagem por pedido" suffix="R$" value={inp.packagingCost} onChange={set("packagingCost")} />
            <Num label="Cupom/desconto do vendedor" suffix="%" value={inp.sellerDiscountPct} onChange={set("sellerDiscountPct")} hint="só o que VOCÊ custeia" />
            <Num label="Cupom do vendedor" suffix="R$" value={inp.sellerDiscountValue} onChange={set("sellerDiscountValue")} />
            <Num label="Frete pago por você" suffix="R$" value={inp.shippingCost} onChange={set("shippingCost")} />
            <Num label="Impostos" suffix="% receita" value={inp.taxPct} onChange={set("taxPct")} hint={`regime: ${props.taxRegime.replace("_", " ")}`} />
            <Num label="Anúncios (Ads)" suffix="% receita" value={inp.adsPct} onChange={set("adsPct")} />
            <Num label="Perdas/devoluções" suffix="% receita" value={inp.lossPct} onChange={set("lossPct")} />
            <Num label="Outros custos variáveis" suffix="R$/pedido" value={inp.otherVariableCost} onChange={set("otherVariableCost")} />
            <Num label="Despesas fixas" suffix="R$/mês" value={inp.fixedMonthly} onChange={set("fixedMonthly")} hint="rateio separado" />
            <Num label="Volume mensal" suffix="vendas" value={inp.monthlyVolume} onChange={set("monthlyVolume")} />
          </div>
          <p className="mt-3 text-xs text-mute">Descontos e cupons custeados pela Shopee, subsídio Pix e frete grátis subsidiado não reduzem o seu repasse e por isso não entram no cálculo (sem dupla contagem).</p>
        </Card>

        <Card title="Resultado por venda" className="xl:col-span-2">
          <Row l="Receita bruta" v={brl(r.grossRevenue)} />
          <Row l="(−) Desconto do vendedor" v={brl(-r.sellerDiscount)} neg={r.sellerDiscount > 0} />
          <Row l="Receita após descontos" v={brl(r.revenueAfterDiscount)} strong />
          <Row l={`(−) Comissão ${(r.fees.pct * 100).toFixed(0)}%`} sub={`faixa ${r.fees.bandLabel}`} v={brl(-r.fees.commission)} neg />
          <Row l="(−) Tarifa fixa por item" v={brl(-r.fees.fixed)} neg />
          {r.fees.cpfSurcharge > 0 && <Row l="(−) Adicional CPF" v={brl(-r.fees.cpfSurcharge)} neg />}
          <Row l="Total de tarifas Shopee" v={brl(r.fees.total)} sub={pct(r.fees.total / (r.revenueAfterDiscount || 1))} />
          <Row l="Receita líquida de tarifas" v={brl(r.netOfFees)} strong />
          <Row l="(−) Mercadoria" v={brl(-r.productCost)} neg />
          <Row l="(−) Embalagem + frete + outros" v={brl(-(inp.packagingCost + inp.shippingCost + inp.otherVariableCost))} neg />
          <Row l="(−) Impostos" v={brl(-r.tax)} neg />
          <Row l="(−) Anúncios + perdas" v={brl(-(r.ads + r.loss))} neg />
          <Row l="Custo variável total" v={brl(r.variableCosts)} />
          <div className={`mt-2 rounded-lg p-3 ${r.contributionMargin >= 0 ? "bg-brand-green/10" : "bg-red-500/10"}`}>
            <Row l="Margem de contribuição" v={`${brl(r.contributionMargin)} · ${pct(r.contributionPct)}`} strong />
            <Row l="(−) Rateio de despesas fixas" v={brl(-r.fixedPerUnit)} />
            <Row l="Lucro estimado por unidade" v={`${brl(r.profitPerUnit)} · ${pct(r.profitPct)}`} strong />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-panel2 p-2"><div className="text-mute">Markup</div><div className="text-sm font-semibold">{r.markup.toFixed(2)}×</div></div>
            <div className="rounded-lg bg-panel2 p-2"><div className="text-mute">ROI</div><div className="text-sm font-semibold">{pct(r.roi)}</div></div>
            <div className="rounded-lg bg-panel2 p-2"><div className="text-mute">Equilíbrio</div><div className="text-sm font-semibold">{be ? brl(be) : "—"}</div></div>
          </div>
          {r.warnings.map((w) => <p key={w} className="mt-2 text-xs text-amber-300">⚠ {w}</p>)}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Simulação reversa">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Num label="Quero lucrar por venda" suffix="R$" value={targetProfit} onChange={setTargetProfit} />
              <div className="mt-2 text-sm">Preço mínimo: <b className="text-brand-green">{pProfit ? brl(pProfit) : "inatingível"}</b></div>
            </div>
            <div>
              <Num label="Quero margem de" suffix="%" value={targetMargin} onChange={setTargetMargin} />
              <div className="mt-2 text-sm">Preço mínimo: <b className="text-brand-green">{pMargin ? brl(pMargin) : "inatingível"}</b></div>
            </div>
          </div>
          <p className="mt-3 text-xs text-mute">Considera a troca de faixa de comissão: ao passar de R$ 79,99 para R$ 80 a tarifa fixa sobe de R$ 4,50 para R$ 16 — o sistema devolve o menor preço que realmente atinge a meta. Base: margem de contribuição.</p>
        </Card>

        <Card title="Teste de preços × concorrência">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preços a testar"><input className={input} value={testPrices} onChange={(e) => setTestPrices(e.target.value)} /></Field>
            <Field label="Preços dos concorrentes" hint="separe por espaço"><input className={input} value={compPrices} onChange={(e) => setCompPrices(e.target.value)} placeholder="sem dados" /></Field>
          </div>
          <div className="mt-3">
            <Table head={["Preço", "Tarifas", "Margem", "%", "Posição vs concorrentes"]}>
              {tests.map((t) => (
                <tr key={t.price} className={t.best ? "bg-brand-green/10" : ""}>
                  <td className={td}>{brl(t.price)} {t.best && <Badge tone="green">melhor equilíbrio</Badge>}</td>
                  <td className={td}>{brl(t.result.fees.total)}</td>
                  <td className={`${td} ${t.result.contributionMargin < 0 ? "text-red-400" : ""}`}>{brl(t.result.contributionMargin)}</td>
                  <td className={td}>{pct(t.result.contributionPct)}</td>
                  <td className={td}>{t.percentile === null ? "—" : `mais caro que ${pct(t.percentile, 0)}`}</td>
                </tr>
              ))}
            </Table>
          </div>
          <p className="mt-2 text-xs text-mute">“Melhor equilíbrio” = maior margem entre os preços que ficam até a mediana dos concorrentes. Sem preços de concorrentes, nenhum é indicado. Não há previsão de demanda.</p>
        </Card>
      </div>

      <Card title="Simulação de kits">
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Num label="Desconto no kit" suffix="%" value={kitDiscount} onChange={setKitDiscount} hint="sobre preço unitário × qtd" />
          <Num label="Kit personalizado" suffix="un." value={customKit} onChange={setCustomKit} />
        </div>
        <Table head={["Kit", "Preço do kit", "Faixa", "Tarifas", "Margem do kit", "Margem por unidade", "vs vender separado"]}>
          {kits.map((k) => (
            <tr key={`${k.u}-${k.custom}`}>
              <td className={td}>{k.u === 1 ? "Unitário" : `${k.u} un.`}{k.custom && " (personalizado)"}</td>
              <td className={td}>{brl(k.price)}</td>
              <td className={`${td} text-xs text-mute`}>{(k.res.fees.pct * 100).toFixed(0)}% + {brl(k.res.fees.fixed)}</td>
              <td className={td}>{brl(k.res.fees.total)}</td>
              <td className={td}>{brl(k.res.contributionMargin)} <span className="text-xs text-mute">{pct(k.res.contributionPct)}</span></td>
              <td className={td}>{brl(k.res.contributionMargin / k.u)}</td>
              <td className={`${td} ${k.res.contributionMargin - k.separate >= 0 ? "text-green-400" : "text-red-400"}`}>{k.u === 1 ? "—" : brl(k.res.contributionMargin - k.separate)}</td>
            </tr>
          ))}
        </Table>
        <p className="mt-2 text-xs text-mute">Kit = 1 anúncio com N unidades: comissão e tarifa fixa incidem uma vez sobre o preço do kit, conforme a faixa do valor do item. Embalagem considerada uma por pedido.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Cenários">
          <Table head={["Cenário", "Preço", "Custo un.", "Volume", "Margem/un.", "Lucro mensal"]}>
            {(Object.keys(scen) as (keyof typeof DEFAULT_SCENARIOS)[]).map((k) => {
              const sc = scenario(inp, scen[k], rules, opts);
              return (
                <tr key={k}>
                  <td className={td}><div className="font-medium">{scen[k].label}</div><div className="text-[11px] text-mute">{scen[k].description}</div></td>
                  <td className={td}>{brl(sc.input.price)}</td>
                  <td className={td}>{brl(sc.input.unitCost)}</td>
                  <td className={td}>{sc.input.monthlyVolume}</td>
                  <td className={td}>{brl(sc.result.contributionMargin)}</td>
                  <td className={`${td} font-semibold ${sc.result.monthlyNetProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{brl(sc.result.monthlyNetProfit)}</td>
                </tr>
              );
            })}
          </Table>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["conservador", "otimista"] as const).map((k) => (
              <div key={k} className="col-span-3 grid grid-cols-3 gap-2 md:col-span-3">
                <Num label={`${scen[k].label}: preço %`} value={scen[k].pricePct} onChange={(n) => setScen((s) => ({ ...s, [k]: { ...s[k], pricePct: n, description: "Premissas ajustadas por você." } }))} />
                <Num label="custo %" value={scen[k].costPct} onChange={(n) => setScen((s) => ({ ...s, [k]: { ...s[k], costPct: n, description: "Premissas ajustadas por você." } }))} />
                <Num label="volume ×" value={scen[k].volumeFactor} onChange={(n) => setScen((s) => ({ ...s, [k]: { ...s[k], volumeFactor: n, description: "Premissas ajustadas por você." } }))} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Lucro mensal por volume">
          <Field label="Volumes (vendas/mês)"><input className={input} value={volumes} onChange={(e) => setVolumes(e.target.value)} /></Field>
          <div className="mt-3">
            <Table head={["Vendas/mês", "Faturamento", "Margem de contribuição", "Despesas fixas", "Lucro líquido", "Estoque necessário"]}>
              {vols.map((v) => {
                const x = calculate({ ...inp, monthlyVolume: v }, rules, opts);
                return (
                  <tr key={v}>
                    <td className={td}>{v.toLocaleString("pt-BR")}</td>
                    <td className={td}>{brl(x.revenueAfterDiscount * v)}</td>
                    <td className={td}>{brl(x.monthlyContribution)}</td>
                    <td className={td}>{brl(inp.fixedMonthly)}</td>
                    <td className={`${td} font-semibold ${x.monthlyNetProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{brl(x.monthlyNetProfit)}</td>
                    <td className={td}>{brl((x.productCost + inp.packagingCost) * v)}</td>
                  </tr>
                );
              })}
            </Table>
          </div>
          <div className="mt-3"><SimpleBars money data={vols.map((v) => ({ name: `${v}`, value: calculate({ ...inp, monthlyVolume: v }, rules, opts).monthlyNetProfit }))} /></div>
          <p className="text-xs text-mute">Volumes são hipóteses suas, não previsão de demanda.</p>
        </Card>
      </div>
      <Card title="Compra de lote e fluxo de caixa">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Num label="Unidades no lote" value={lotUnits} onChange={setLotUnits} />
          <Num label="Preço do fornecedor" suffix="R$/un." value={lotPrice} onChange={setLotPrice} />
          <Num label="Frete do lote" suffix="R$" value={lotFreight} onChange={setLotFreight} />
          <Num label="Outros custos iniciais" suffix="R$" value={lotOther} onChange={setLotOther} hint="fotos, etiquetas…" />
          <Num label="Vendas por mês (hipótese)" value={lotSales} onChange={setLotSales} hint="anúncios vendidos" />
          <Num label="Prazo de repasse Shopee" suffix="dias" value={payout} onChange={setPayout} hint="após a venda" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            ["Investimento", brl(lotSim.investment)],
            ["Esgota o lote em", lotSim.daysToSellOut === null ? "—" : `${lotSim.daysToSellOut} dias`],
            ["Dinheiro volta em", lotSim.paybackDay === null ? "não volta no período" : `${lotSim.paybackDay} dias`],
            ["Retorno total", brl(lotSim.totalReturn)],
            ["Lucro do lote", brl(lotSim.profit)],
            ["ROI (mensalizado)", `${pct(lotSim.roi)} (${pct(lotSim.monthlyRoi)}/mês)`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-panel2 p-3">
              <div className="text-[11px] uppercase text-mute">{l}</div>
              <div className={`mt-1 text-sm font-semibold ${l === "Lucro do lote" ? (lotSim.profit >= 0 ? "text-green-400" : "text-red-400") : ""}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-4"><CashChart data={lotSim.series} /></div>
        <p className="mt-2 text-xs text-mute">
          Usa o preço e os custos variáveis definidos acima. O ritmo de vendas é uma hipótese sua, não uma previsão. Mostra quanto dinheiro fica empatado e quando ele volta, considerando o prazo de repasse da Shopee.
        </p>
      </Card>
      {!props.hasProducts && <p className="text-xs text-mute">Dica: cadastre produtos e cotações para abrir a calculadora já preenchida.</p>}
    </div>
  );
}
