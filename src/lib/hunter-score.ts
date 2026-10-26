// Hunter Score (0–100): média ponderada de fatores normalizados. Fatores sem dados são excluídos
// e os pesos redistribuídos; a ausência reduz o Índice de Confiança, e abaixo do mínimo o produto
// NÃO é tratado como oportunidade confirmada.
import { clamp01 } from "./stats";
import type { WindowValue } from "./trends";

export interface Weights {
  demand: number;
  growth: number;
  competition: number;
  margin: number;
  suppliers: number;
}

export const DEFAULT_WEIGHTS: Weights = { demand: 25, growth: 25, competition: 20, margin: 20, suppliers: 10 };
export const MIN_CONFIDENCE = 0.6;

export interface ScoreInput {
  sales: WindowValue | null; // vendas no período
  periodDays: number;
  growth: number | null; // crescimento vs período anterior
  saturation: number | null; // 0–100
  marginPct: number | null; // margem de contribuição com fornecedor escolhido
  suppliersWithPrice: number; // brasileiros contam 1, internacionais 0,6
  suppliersOnRequest: number; // "sob consulta"
  spike: boolean;
  spanDays: number;
  investment: number | null;
}

export interface Factor {
  key: keyof Weights;
  label: string;
  raw: string;
  normalized: number | null; // 0–100
  weight: number;
  contribution: number;
  method: string;
}

export type Recommendation = "Comprar para testar" | "Monitorar" | "Evitar no momento";

export interface ScoreResult {
  score: number | null;
  confidence: number; // 0–1
  confirmed: boolean;
  factors: Factor[];
  recommendation: Recommendation;
  justification: string[];
  risks: string[];
  advantages: string[];
}

const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;

export function hunterScore(inp: ScoreInput, weights: Weights = DEFAULT_WEIGHTS): ScoreResult {
  const salesPerMonth = inp.sales ? (inp.sales.value / inp.periodDays) * 30 : null;
  const supplierPoints = inp.suppliersWithPrice + inp.suppliersOnRequest * 0.25;
  const f: Factor[] = [
    {
      key: "demand",
      label: "Demanda",
      raw: salesPerMonth === null ? "sem dados" : `${Math.round(salesPerMonth)} vendas/mês${inp.sales?.observed ? "" : " (estimativa)"}`,
      normalized: salesPerMonth === null ? null : clamp01(Math.log10(1 + salesPerMonth) / Math.log10(1 + 3000)) * 100,
      weight: weights.demand,
      contribution: 0,
      method: "Escala logarítmica: 0 vendas = 0; 3.000 vendas/mês ou mais = 100.",
    },
    {
      key: "growth",
      label: "Crescimento",
      raw: inp.growth === null ? "sem dados" : pct(inp.growth),
      normalized: inp.growth === null ? null : clamp01((inp.growth + 0.5) / 1.5) * 100,
      weight: weights.growth,
      contribution: 0,
      method: "−50% ou pior = 0; estável (0%) = 33; +100% ou mais = 100.",
    },
    {
      key: "competition",
      label: "Concorrência",
      raw: inp.saturation === null ? "sem dados" : `saturação ${inp.saturation.toFixed(0)}/100`,
      normalized: inp.saturation === null ? null : 100 - inp.saturation,
      weight: weights.competition,
      contribution: 0,
      method: "100 − pontuação de saturação (menos concorrência = melhor).",
    },
    {
      key: "margin",
      label: "Margem estimada",
      raw: inp.marginPct === null ? "sem custo de fornecedor" : pct(inp.marginPct),
      normalized: inp.marginPct === null ? null : clamp01(inp.marginPct / 0.35) * 100,
      weight: weights.margin,
      contribution: 0,
      method: "Margem de contribuição: 0% ou negativa = 0; 35% ou mais = 100.",
    },
    {
      key: "suppliers",
      label: "Fornecedores",
      raw: `${inp.suppliersWithPrice} com preço, ${inp.suppliersOnRequest} sob consulta`,
      normalized: clamp01(supplierPoints / 3) * 100,
      weight: weights.suppliers,
      contribution: 0,
      method: "3 fornecedores com preço verificado = 100 (internacional vale 0,6; sob consulta 0,25).",
    },
  ];
  const avail = f.filter((x) => x.normalized !== null);
  const wAvail = avail.reduce((s, x) => s + x.weight, 0);
  const wTotal = f.reduce((s, x) => s + x.weight, 0) || 1;
  avail.forEach((x) => (x.contribution = wAvail ? ((x.normalized as number) * x.weight) / wAvail : 0));
  const score = avail.length ? avail.reduce((s, x) => s + x.contribution, 0) : null;
  const dataQuality = inp.sales ? inp.sales.confidence : 0.5;
  const confidence = (wAvail / wTotal) * (inp.sales || inp.growth !== null ? dataQuality : 0.5);
  const confirmed = confidence >= MIN_CONFIDENCE && f[0].normalized !== null && f[3].normalized !== null;

  const risks: string[] = [];
  const advantages: string[] = [];
  if (inp.saturation !== null && inp.saturation >= 70) risks.push("Concorrência elevada (saturação ≥ 70).");
  if (inp.marginPct !== null && inp.marginPct < 0.15) risks.push(`Margem estreita (${pct(inp.marginPct)}): pouco espaço para anúncios e cupons.`);
  if (inp.growth !== null && inp.growth <= -0.15) risks.push("Demanda em queda no período.");
  if (inp.spike) risks.push("Possível pico temporário: o crescimento pode não se sustentar.");
  if (!inp.suppliersWithPrice) risks.push("Nenhum fornecedor com preço verificado.");
  if (inp.sales && !inp.sales.observed) risks.push("Vendas do período estimadas por extrapolação (cobertura parcial de snapshots).");
  if (inp.spanDays < 30) risks.push(`Histórico curto (${Math.floor(inp.spanDays)} dias).`);
  f.filter((x) => x.normalized === null).forEach((x) => risks.push(`${x.label}: sem dados — fator excluído do cálculo.`));
  if (inp.growth !== null && inp.growth >= 0.2) advantages.push(`Crescimento de ${pct(inp.growth)} no período.`);
  if (inp.saturation !== null && inp.saturation <= 40) advantages.push("Concorrência moderada/baixa.");
  if (inp.marginPct !== null && inp.marginPct >= 0.25) advantages.push(`Margem saudável (${pct(inp.marginPct)}).`);
  if (inp.suppliersWithPrice >= 1) advantages.push("Fornecedor com preço verificado disponível.");

  let recommendation: Recommendation = "Monitorar";
  const justification: string[] = [];
  if (!confirmed) {
    justification.push(`Confiança ${pct(confidence)} (mínimo ${pct(MIN_CONFIDENCE)}) ou faltam demanda/margem: oportunidade NÃO confirmada. Continue coletando dados e cadastre cotações.`);
  } else if (score !== null && (score < 40 || (inp.marginPct ?? 0) < 0.05)) {
    recommendation = "Evitar no momento";
    justification.push(`Score ${score.toFixed(0)} abaixo de 40 ou margem inferior a 5%.`);
  } else if (score !== null && score >= 65 && (inp.marginPct ?? 0) >= 0.15) {
    recommendation = "Comprar para testar";
    justification.push(`Score ${score.toFixed(0)} ≥ 65, margem ≥ 15% e dados com confiança suficiente. Teste com lote pequeno.`);
  } else if (score !== null) {
    justification.push(`Score ${score.toFixed(0)} intermediário: acompanhe a evolução antes de comprar.`);
  }
  f.forEach((x) => x.normalized !== null && justification.push(`${x.label}: ${x.raw} → ${x.normalized.toFixed(0)} pts × peso ${((x.weight / (wAvail || 1)) * 100).toFixed(0)}% = ${x.contribution.toFixed(1)}`));
  return { score, confidence, confirmed, factors: f, recommendation, justification, risks, advantages };
}
