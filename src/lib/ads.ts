// Shopee Ads: quanto dá para gastar em anúncio sem ter prejuízo.
// ROAS (como a Shopee mostra) = vendas geradas pelo anúncio ÷ valor gasto. ACOS = gasto ÷ vendas.
// A margem usada é a de contribuição SEM anúncios (tarifas, imposto, mercadoria, embalagem etc. já descontados).
import { round2 } from "./fees";

export interface AdsInput {
  revenue: number; // receita por venda após desconto do vendedor
  marginBeforeAds: number; // margem de contribuição por venda, sem custo de anúncio
  targetProfit: number; // lucro que você quer manter por venda vinda de anúncio
  cpc?: number | null; // custo por clique médio (da sua campanha)
  conversionPct?: number | null; // % de cliques que viram venda (da sua campanha)
  campaignRoas?: number | null; // ROAS atual da campanha
  dailyBudget?: number | null; // orçamento diário
}

export interface AdsResult {
  maxCostPerSale: number | null; // gasto máximo por venda sem prejuízo
  breakEvenRoas: number | null;
  breakEvenAcos: number | null;
  targetCostPerSale: number | null; // gasto máximo mantendo o lucro desejado
  targetRoas: number | null;
  maxCpc: number | null; // CPC máximo para manter o lucro desejado (exige taxa de conversão)
  costPerSaleNow: number | null; // gasto por venda com CPC e conversão informados
  campaign: { salesPerDay: number; profitPerDay: number; profitPerSale: number } | null;
  warnings: string[];
}

export function adsBreakEven(i: AdsInput): AdsResult {
  const warnings: string[] = [];
  const out: AdsResult = { maxCostPerSale: null, breakEvenRoas: null, breakEvenAcos: null, targetCostPerSale: null, targetRoas: null, maxCpc: null, costPerSaleNow: null, campaign: null, warnings };
  if (i.revenue <= 0) return out;
  if (i.marginBeforeAds <= 0) {
    warnings.push("Sem margem antes dos anúncios: qualquer gasto com Shopee Ads gera prejuízo nesse preço.");
    return out;
  }
  out.maxCostPerSale = round2(i.marginBeforeAds);
  out.breakEvenRoas = i.revenue / i.marginBeforeAds;
  out.breakEvenAcos = i.marginBeforeAds / i.revenue;
  const room = i.marginBeforeAds - Math.max(0, i.targetProfit);
  if (room > 0) {
    out.targetCostPerSale = round2(room);
    out.targetRoas = i.revenue / room;
  } else warnings.push("O lucro desejado é maior ou igual à margem: não sobra nada para anúncio.");
  const conv = i.conversionPct && i.conversionPct > 0 ? i.conversionPct / 100 : null;
  if (conv && out.targetCostPerSale !== null) out.maxCpc = round2(out.targetCostPerSale * conv);
  if (conv && i.cpc && i.cpc > 0) out.costPerSaleNow = round2(i.cpc / conv);
  if (i.campaignRoas && i.campaignRoas > 0 && i.dailyBudget && i.dailyBudget > 0) {
    const salesPerDay = (i.dailyBudget * i.campaignRoas) / i.revenue;
    const profitPerDay = salesPerDay * i.marginBeforeAds - i.dailyBudget;
    out.campaign = { salesPerDay, profitPerDay: round2(profitPerDay), profitPerSale: round2(i.marginBeforeAds - i.revenue / i.campaignRoas) };
  }
  return out;
}
