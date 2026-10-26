// Calculadora de rentabilidade. Todos os valores são por ANÚNCIO VENDIDO (1 item na Shopee).
// Para kits, o anúncio contém N unidades: a tarifa da Shopee incide uma vez sobre o preço do kit.
import { computeFees, round2, type FeeBreakdown, type FeeOptions, type FeeRules } from "./fees";

export interface CalcInput {
  price: number; // preço anunciado do item/kit
  unitsPerListing: number; // 1 = unitário; 2, 3, 5... = kit
  unitCost: number; // custo de aquisição por unidade
  packagingCost: number; // embalagem por pedido
  sellerDiscountPct: number; // desconto/cupom custeado pelo vendedor (% do preço)
  sellerDiscountValue: number; // desconto/cupom custeado pelo vendedor (R$)
  shippingCost: number; // frete pago pelo vendedor por pedido
  taxPct: number; // alíquota sobre a receita (regime informado)
  adsPct: number; // investimento em anúncios (% da receita)
  otherVariableCost: number; // outros custos variáveis por pedido (R$)
  lossPct: number; // provisão p/ perdas, devoluções, avarias (% da receita)
  fixedMonthly: number; // despesas fixas mensais (rateio separado)
  monthlyVolume: number; // anúncios vendidos por mês (para rateio)
}

export interface CalcResult {
  grossRevenue: number;
  sellerDiscount: number;
  revenueAfterDiscount: number;
  fees: FeeBreakdown;
  netOfFees: number;
  productCost: number;
  tax: number;
  ads: number;
  loss: number;
  variableCosts: number; // custos variáveis, sem as tarifas Shopee
  contributionMargin: number; // receita após desconto − tarifas − custos variáveis
  contributionPct: number;
  fixedPerUnit: number;
  profitPerUnit: number; // margem de contribuição − rateio de despesas fixas
  profitPct: number;
  markup: number; // preço / custo da mercadoria
  roi: number; // margem de contribuição / (mercadoria + embalagem)
  monthlyContribution: number;
  monthlyNetProfit: number; // após despesas fixas
  warnings: string[];
}

export const DEFAULT_INPUT: CalcInput = {
  price: 39.9,
  unitsPerListing: 1,
  unitCost: 12,
  packagingCost: 1.2,
  sellerDiscountPct: 0,
  sellerDiscountValue: 0,
  shippingCost: 0,
  taxPct: 0,
  adsPct: 0,
  otherVariableCost: 0,
  lossPct: 0,
  fixedMonthly: 0,
  monthlyVolume: 100,
};

export function calculate(input: CalcInput, rules: FeeRules, feeOpts: FeeOptions = {}): CalcResult {
  const warnings: string[] = [];
  const gross = round2(input.price);
  const sellerDiscount = round2(Math.min(gross, gross * (input.sellerDiscountPct / 100) + input.sellerDiscountValue));
  const revenue = round2(gross - sellerDiscount);
  // Cupom da loja reduz a base da comissão; cupons/subsídios da Shopee não afetam o repasse.
  const fees = computeFees(revenue, rules, feeOpts);
  warnings.push(...fees.warnings);
  const netOfFees = round2(revenue - fees.total);
  const units = Math.max(1, Math.floor(input.unitsPerListing));
  const productCost = round2(input.unitCost * units);
  const tax = round2(revenue * (input.taxPct / 100));
  const ads = round2(revenue * (input.adsPct / 100));
  const loss = round2(revenue * (input.lossPct / 100));
  const variableCosts = round2(productCost + input.packagingCost + input.shippingCost + tax + ads + loss + input.otherVariableCost);
  const contribution = round2(netOfFees - variableCosts);
  const fixedPerUnit = input.monthlyVolume > 0 ? round2(input.fixedMonthly / input.monthlyVolume) : 0;
  const profit = round2(contribution - fixedPerUnit);
  const invested = productCost + input.packagingCost;
  if (input.taxPct === 0) warnings.push("Alíquota de impostos = 0%. Configure o seu regime tributário para um resultado real.");
  return {
    grossRevenue: gross,
    sellerDiscount,
    revenueAfterDiscount: revenue,
    fees,
    netOfFees,
    productCost,
    tax,
    ads,
    loss,
    variableCosts,
    contributionMargin: contribution,
    contributionPct: revenue > 0 ? contribution / revenue : 0,
    fixedPerUnit,
    profitPerUnit: profit,
    profitPct: revenue > 0 ? profit / revenue : 0,
    markup: productCost > 0 ? gross / productCost : 0,
    roi: invested > 0 ? contribution / invested : 0,
    monthlyContribution: round2(contribution * input.monthlyVolume),
    monthlyNetProfit: round2(contribution * input.monthlyVolume - input.fixedMonthly),
    warnings,
  };
}

// ---------- Simulação reversa ----------
// A margem não é monotônica no preço: ao cruzar R$ 80 a tarifa fixa sobe de R$ 4,50 para R$ 16.
// Por isso resolvemos faixa a faixa (bisseção dentro de cada faixa, onde a função é crescente)
// e devolvemos o MENOR preço que atinge a meta.

type Goal = { kind: "profit"; value: number } | { kind: "margin"; value: number };

function meets(r: CalcResult, goal: Goal): number {
  return goal.kind === "profit" ? r.contributionMargin - goal.value : r.contributionPct - goal.value / 100;
}

export function solvePrice(input: CalcInput, rules: FeeRules, goal: Goal, feeOpts: FeeOptions = {}): number | null {
  const evalAt = (p: number) => meets(calculate({ ...input, price: p }, rules, feeOpts), goal);
  // Pontos de quebra no preço anunciado (convertidos da base após desconto do vendedor).
  const toPrice = (base: number) => (base + input.sellerDiscountValue) / (1 - input.sellerDiscountPct / 100);
  const edges = new Set<number>([0.01]);
  rules.bands.forEach((b) => b.min > 0 && edges.add(toPrice(b.min)));
  if (rules.lowPrice) edges.add(toPrice(rules.lowPrice.below));
  if (rules.cpfSurcharge?.regressiveBelow) edges.add(toPrice(rules.cpfSurcharge.regressiveBelow));
  const sorted = [...edges].sort((a, b) => a - b);
  sorted.push(100000);
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = Math.ceil(sorted[i] * 100) / 100;
    const hi = Math.ceil(sorted[i + 1] * 100) / 100 - 0.01;
    if (hi < lo) continue;
    if (evalAt(hi) < 0) continue; // nem o topo da faixa atinge a meta
    if (evalAt(lo) >= 0) return round2(lo);
    let a = lo;
    let b = hi;
    for (let k = 0; k < 60 && b - a > 0.005; k++) {
      const m = (a + b) / 2;
      if (evalAt(m) >= 0) b = m;
      else a = m;
    }
    // arredonda para o centavo seguinte e confirma
    let p = Math.ceil(b * 100) / 100;
    while (evalAt(p) < 0 && p <= hi) p = round2(p + 0.01);
    if (p <= hi) return round2(p);
  }
  return null; // meta inatingível (ex.: margem desejada maior que o possível após comissão)
}

export const breakEvenPrice = (input: CalcInput, rules: FeeRules, o: FeeOptions = {}) =>
  solvePrice(input, rules, { kind: "profit", value: 0 }, o);

// ---------- Cenários ----------
export interface ScenarioAssumptions {
  pricePct: number; // variação do preço (%)
  costPct: number; // variação do custo da mercadoria e embalagem (%)
  volumeFactor: number; // multiplicador do volume
  label: string;
  description: string;
}

export const DEFAULT_SCENARIOS: Record<"conservador" | "realista" | "otimista", ScenarioAssumptions> = {
  conservador: { pricePct: -10, costPct: 10, volumeFactor: 0.5, label: "Conservador", description: "Preço 10% menor (pressão de concorrência), custos 10% maiores, metade do volume." },
  realista: { pricePct: 0, costPct: 0, volumeFactor: 1, label: "Realista", description: "Preço, custos e volume informados por você." },
  otimista: { pricePct: 0, costPct: -5, volumeFactor: 1.5, label: "Otimista", description: "Mesmo preço, custos 5% menores (negociação), volume 50% maior." },
};

export function scenario(input: CalcInput, s: ScenarioAssumptions, rules: FeeRules, o: FeeOptions = {}) {
  const adj: CalcInput = {
    ...input,
    price: round2(input.price * (1 + s.pricePct / 100)),
    unitCost: input.unitCost * (1 + s.costPct / 100),
    packagingCost: input.packagingCost * (1 + s.costPct / 100),
    monthlyVolume: Math.round(input.monthlyVolume * s.volumeFactor),
  };
  return { input: adj, result: calculate(adj, rules, o) };
}

// ---------- Comparação de preços vs. concorrência ----------
export interface PriceTestRow {
  price: number;
  result: CalcResult;
  percentile: number | null; // % de concorrentes com preço menor ou igual
  best: boolean;
}

export function priceTests(input: CalcInput, prices: number[], rules: FeeRules, competitorPrices: number[], o: FeeOptions = {}): PriceTestRow[] {
  const comp = [...competitorPrices].sort((a, b) => a - b);
  const rows: PriceTestRow[] = prices.map((p) => {
    const result = calculate({ ...input, price: p }, rules, o);
    const percentile = comp.length ? comp.filter((c) => c <= p).length / comp.length : null;
    return { price: p, result, percentile, best: false };
  });
  // "Melhor equilíbrio": maior margem de contribuição entre os preços até a mediana da concorrência
  // (sem previsão de demanda). Sem dados de concorrência, não indicamos melhor preço.
  if (comp.length) {
    const eligible = rows.filter((r) => r.percentile !== null && r.percentile <= 0.5 && r.result.contributionMargin > 0);
    const best = eligible.sort((a, b) => b.result.contributionMargin - a.result.contributionMargin)[0];
    if (best) best.best = true;
  }
  return rows.sort((a, b) => a.price - b.price);
}
