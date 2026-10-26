// Inteligência de concorrência a partir dos anúncios OBSERVADOS (coletados ou cadastrados).
import { computeFees, type FeeRules } from "./fees";
import { clamp01, mean, median, quantile, stdev } from "./stats";

export interface CompListing {
  id: string;
  title: string;
  shopId: string | null;
  shopName: string;
  url: string;
  price: number | null;
  salesCumulative: number | null;
  ratingStar: number | null;
  ratingCount: number | null;
  weakPhotos: boolean;
  weakDescription: boolean;
}

export interface Competition {
  observedListings: number;
  observedShops: number;
  pageLimitReached: boolean; // a busca devolveu o máximo da página: existem possivelmente mais anúncios
  price: { min: number; p25: number; median: number; p75: number; max: number; spreadPct: number } | null;
  avgRating: number | null;
  top: CompListing[];
  top3ShopShare: number | null; // participação dos 3 maiores vendedores no acumulado de vendas
  hhi: number | null; // Herfindahl (0–10.000)
  saturation: number | null;
  saturationParts: { label: string; value: number; weight: number }[];
  opportunities: string[];
  kitIdeas: { units: number; kitPrice: number; feeSeparate: number; feeKit: number; saving: number }[];
}

export function analyzeCompetition(listings: CompListing[], rules: FeeRules, pageLimitReached = false): Competition {
  const prices = listings.map((l) => l.price).filter((p): p is number => p !== null && p > 0);
  const shops = new Map<string, number>();
  listings.forEach((l) => {
    const k = l.shopId || l.shopName || l.id;
    shops.set(k, (shops.get(k) ?? 0) + (l.salesCumulative ?? 0));
  });
  const totalSales = [...shops.values()].reduce((a, b) => a + b, 0);
  const shares = totalSales > 0 ? [...shops.values()].map((v) => v / totalSales).sort((a, b) => b - a) : [];
  const price = prices.length
    ? {
        min: Math.min(...prices),
        p25: quantile(prices, 0.25)!,
        median: median(prices)!,
        p75: quantile(prices, 0.75)!,
        max: Math.max(...prices),
        spreadPct: Math.max(...prices) / Math.min(...prices) - 1,
      }
    : null;
  const ratings = listings.map((l) => l.ratingStar).filter((r): r is number => r !== null && r > 0);

  // Saturação 0–100 (maior = mais concorrido). Componentes transparentes:
  const parts: Competition["saturationParts"] = [];
  let saturation: number | null = null;
  if (listings.length >= 3) {
    const cv = prices.length >= 3 ? (stdev(prices)! / mean(prices)!) : null;
    const established = listings.filter((l) => (l.ratingCount ?? 0) >= 1000 || (l.salesCumulative ?? 0) >= 1000).length / listings.length;
    parts.push({ label: "Volume de anúncios (escala log, 200+ = máx.)", value: clamp01(Math.log10(1 + listings.length) / Math.log10(201)), weight: 0.35 });
    parts.push({ label: "Vendedores distintos (escala log, 100+ = máx.)", value: clamp01(Math.log10(1 + shops.size) / Math.log10(101)), weight: 0.25 });
    if (cv !== null) parts.push({ label: "Compressão de preços (baixa dispersão = commodity)", value: 1 - clamp01(cv / 0.5), weight: 0.2 });
    parts.push({ label: "Anúncios consolidados (≥1.000 vendas ou avaliações)", value: established, weight: 0.2 });
    const w = parts.reduce((s, p) => s + p.weight, 0);
    saturation = (parts.reduce((s, p) => s + p.value * p.weight, 0) / w) * 100;
    if (pageLimitReached) saturation = Math.max(saturation, 60);
  }

  const opportunities: string[] = [];
  const lowRated = ratings.filter((r) => r < 4.5).length;
  if (ratings.length >= 3 && lowRated / ratings.length >= 0.4)
    opportunities.push(`${lowRated} de ${ratings.length} anúncios com nota abaixo de 4,5: há espaço para um produto/atendimento de qualidade superior.`);
  const weakP = listings.filter((l) => l.weakPhotos).length;
  const weakD = listings.filter((l) => l.weakDescription).length;
  if (weakP) opportunities.push(`${weakP} anúncio(s) marcados por você com fotos fracas: invista em fotos profissionais.`);
  if (weakD) opportunities.push(`${weakD} anúncio(s) marcados com descrição fraca: diferencie com descrição completa, medidas e perguntas frequentes.`);
  if (shares.length >= 3 && shares[0] + shares[1] + shares[2] >= 0.6)
    opportunities.push("Vendas concentradas em poucos vendedores (top 3 ≥ 60% do acumulado): entrada mais difícil, exige diferencial claro.");
  if (price && price.spreadPct >= 1) opportunities.push("Grande dispersão de preços (máx. ≥ 2× mín.): mercado comporta versão premium e versão econômica.");

  const kitIdeas: Competition["kitIdeas"] = [];
  if (price && price.median < 40) {
    for (const units of [2, 3, 5]) {
      const kitPrice = Math.round(price.median * units * 0.95 * 100) / 100;
      const feeSeparate = computeFees(price.median, rules).total * units;
      const feeKit = computeFees(kitPrice, rules).total;
      kitIdeas.push({ units, kitPrice, feeSeparate, feeKit, saving: feeSeparate - feeKit });
    }
    opportunities.push("Ticket baixo: a tarifa fixa pesa muito por unidade. Kits/combos diluem a tarifa fixa (veja simulação).");
  }

  return {
    observedListings: listings.length,
    observedShops: shops.size,
    pageLimitReached,
    price,
    avgRating: mean(ratings),
    top: [...listings].sort((a, b) => (b.salesCumulative ?? -1) - (a.salesCumulative ?? -1)).slice(0, 10),
    top3ShopShare: shares.length ? shares.slice(0, 3).reduce((a, b) => a + b, 0) : null,
    hhi: shares.length ? shares.reduce((s, x) => s + (x * 100) ** 2, 0) : null,
    saturation,
    saturationParts: parts,
    opportunities,
    kitIdeas,
  };
}
