// "Vale a pena?": transforma a análise do produto num veredito simples, com o motivo de cada item.
// O veredito é a recomendação do Hunter Score (mesma regra do ranking), só apresentada como semáforo.
import type { ProductAnalysis } from "./analysis";
import { TREND_LABELS } from "./trends";

export type Light = "ok" | "atencao" | "ruim" | "sem_dados";
export type VerdictKey = "comprar" | "monitorar" | "evitar" | "faltam_dados";

export interface Criterion {
  label: string;
  light: Light;
  value: string;
  explain: string;
}

export interface Verdict {
  key: VerdictKey;
  title: string;
  summary: string;
  criteria: Criterion[];
  nextSteps: { text: string; href: string }[];
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const light = (n: number | null): Light => (n === null ? "sem_dados" : n >= 65 ? "ok" : n >= 40 ? "atencao" : "ruim");

export function verdict(a: ProductAnalysis): Verdict {
  const id = a.product.id;
  const f = Object.fromEntries(a.score.factors.map((x) => [x.key, x]));
  const criteria: Criterion[] = [
    { label: "Procura (vendas do mercado)", light: light(f.demand.normalized), value: f.demand.raw, explain: f.demand.method },
    {
      label: "Tendência",
      light: a.trend.classification === "insuficiente" ? "sem_dados" : light(f.growth.normalized),
      value: `${TREND_LABELS[a.trend.classification]}${f.growth.normalized !== null ? ` · ${f.growth.raw}` : ""}`,
      explain: f.growth.method,
    },
    { label: "Concorrência", light: light(f.competition.normalized), value: f.competition.raw, explain: f.competition.method },
    { label: "Margem por venda", light: light(f.margin.normalized), value: a.calc ? `${f.margin.raw} · ${brl(a.calc.contributionMargin)} por venda` : f.margin.raw, explain: f.margin.method },
    { label: "Fornecedores", light: a.chosenQuote && light(f.suppliers.normalized) === "ruim" ? "atencao" : light(f.suppliers.normalized), value: f.suppliers.raw, explain: f.suppliers.method },
  ];
  if (a.lot && a.investment !== null) {
    const pb = a.lot.paybackDay;
    criteria.push({
      label: "Dinheiro do lote",
      light: pb === null ? "ruim" : pb <= 45 ? "ok" : pb <= 90 ? "atencao" : "ruim",
      value: `${brl(a.investment)} investidos · ${pb === null ? `não volta em ${a.lot.series.length} dias` : `volta em ${pb} dias`}`,
      explain: `Hipótese explícita: você vende ${a.lot.hypothesis} por mês (5% das vendas observadas do mercado, limitado ao lote). Até 45 dias = bom; até 90 = atenção.`,
    });
  } else {
    criteria.push({ label: "Dinheiro do lote", light: "sem_dados", value: "sem cotação com preço ou sem vendas medidas", explain: "Precisa de uma cotação de fornecedor e de vendas medidas dos concorrentes." });
  }

  const nextSteps: Verdict["nextSteps"] = [];
  if (f.demand.normalized === null || (a.trend.salesPeriod && !a.trend.salesPeriod.observed) || a.trend.spanDays < 7)
    nextSteps.push({ text: "Salve os concorrentes pela extensão em dias diferentes para medir as vendas", href: "/extensao" });
  if (f.margin.normalized === null || !a.chosenQuote) nextSteps.push({ text: "Registre uma cotação de fornecedor com preço", href: `/fornecedores?p=${id}` });
  if (a.trend.spanDays < 30) nextSteps.push({ text: `Continue acompanhando: histórico de ${Math.floor(a.trend.spanDays)} dia(s), o ideal é 30`, href: `/produtos/${id}` });
  if (a.calc) nextSteps.push({ text: "Simule preço, kits e Shopee Ads na calculadora", href: `/calculadora?p=${id}` });
  nextSteps.push({ text: "Ver concorrência em detalhe", href: `/concorrencia?p=${id}` });

  const s = a.score.score === null ? "" : ` (Hunter Score ${a.score.score.toFixed(0)})`;
  if (!a.score.confirmed)
    return { key: "faltam_dados", title: "Ainda não dá para decidir", summary: `Faltam dados para confirmar. Veja abaixo o que está faltando: decidir agora seria um palpite.`, criteria, nextSteps };
  if (a.score.recommendation === "Comprar para testar")
    return { key: "comprar", title: "Vale testar com um lote pequeno", summary: `Procura, margem e concorrência estão a favor${s}. Comece pequeno e acompanhe as vendas.`, criteria, nextSteps };
  if (a.score.recommendation === "Evitar no momento")
    return { key: "evitar", title: "Não compensa agora", summary: `Os números não fecham${s}. Veja os itens em vermelho: margem, procura ou concorrência.`, criteria, nextSteps };
  return { key: "monitorar", title: "Acompanhe antes de comprar", summary: `Tem pontos bons e pontos de atenção${s}. Continue acompanhando ou melhore o custo e o preço.`, criteria, nextSteps };
}
