// Radar de Tendências: deriva vendas por período a partir de snapshots de vendas ACUMULADAS.
// Regra: vendas do período = diferença do acumulado entre o início e o fim do período,
// interpolando linearmente entre snapshots. Sem cobertura suficiente → null (nunca inventar).
import { DAY, median } from "./stats";

export interface SnapPoint {
  t: Date; // data de referência
  price: number | null;
  salesCumulative: number | null;
  ratingCount: number | null;
  ratingStar: number | null;
}

export interface ListingSeries {
  id: string;
  firstSeenAt: Date;
  snaps: SnapPoint[];
}

export interface WindowValue {
  value: number;
  observed: boolean; // true = medido entre snapshots; false = extrapolado (estimativa)
  confidence: number; // 0..1 = fração do período coberta por dados
}

function valueAt(points: { t: number; v: number }[], t: number): number | null {
  if (!points.length || t < points[0].t || t > points[points.length - 1].t) return null;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (t >= a.t && t <= b.t) return b.t === a.t ? b.v : a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t);
  }
  return points[points.length - 1].v;
}

const MIN_COVERAGE = 0.5;

export function salesInWindow(snaps: SnapPoint[], start: Date, end: Date): WindowValue | null {
  const pts = snaps
    .filter((s) => s.salesCumulative !== null)
    .map((s) => ({ t: s.t.getTime(), v: s.salesCumulative as number }))
    .sort((a, b) => a.t - b.t);
  if (pts.length < 2) return null;
  const s = start.getTime();
  const e = end.getTime();
  const from = Math.max(s, pts[0].t);
  const to = Math.min(e, pts[pts.length - 1].t);
  if (to <= from) return null;
  const coverage = (to - from) / (e - s);
  if (coverage < MIN_COVERAGE) return null;
  const delta = (valueAt(pts, to) as number) - (valueAt(pts, from) as number);
  if (delta < 0) return null; // acumulado diminuiu: dado inconsistente na fonte
  const observed = coverage >= 0.999;
  return { value: observed ? delta : delta / coverage, observed, confidence: Math.min(1, coverage) };
}

export function sumWindows(values: (WindowValue | null)[]): WindowValue | null {
  const ok = values.filter((v): v is WindowValue => v !== null);
  if (!ok.length) return null;
  const total = ok.reduce((a, b) => a + b.value, 0);
  // confiança ponderada pelo volume de cada anúncio × fração de anúncios com dados
  const weighted = total > 0 ? ok.reduce((s, v) => s + v.value * v.confidence, 0) / total : Math.min(...ok.map((v) => v.confidence));
  return {
    value: total,
    observed: ok.every((v) => v.observed) && ok.length === values.length,
    confidence: weighted * (ok.length / values.length),
  };
}

export const growth = (cur: WindowValue | null, prev: WindowValue | null) =>
  cur && prev && prev.value > 0 ? cur.value / prev.value - 1 : null;

function nearestPrice(snaps: SnapPoint[], t: number, tolDays: number): number | null {
  let best: SnapPoint | null = null;
  for (const s of snaps) {
    if (s.price === null) continue;
    if (!best || Math.abs(s.t.getTime() - t) < Math.abs(best.t.getTime() - t)) best = s;
  }
  return best && Math.abs(best.t.getTime() - t) <= tolDays * DAY ? best.price : null;
}

export type TrendClass = "explosivo" | "crescimento" | "estavel" | "saturado" | "queda" | "insuficiente";

export const TREND_CRITERIA = {
  minSpanDays: 14,
  minSnapshots: 4,
  explosivo: { growth7: 0.5, acceleration: 0.3, minSales7: 20 },
  crescimento: { growth30: 0.15 },
  queda: { growth30: -0.15 },
  saturado: { saturation: 70, priceChange: -0.05 },
  spikeFactor: 3,
};

export const TREND_LABELS: Record<TrendClass, string> = {
  explosivo: "Produto Explosivo",
  crescimento: "Produto em Crescimento",
  estavel: "Produto Estável",
  saturado: "Produto Saturado",
  queda: "Produto em Queda",
  insuficiente: "Dados insuficientes",
};

export interface TrendMetrics {
  periodDays: number;
  salesPeriod: WindowValue | null;
  salesPrevPeriod: WindowValue | null;
  growthPeriod: number | null;
  sales7: WindowValue | null;
  growth7: number | null;
  sales30: WindowValue | null;
  growth30: number | null;
  acceleration: number | null; // ritmo 7d ÷ ritmo 30d − 1
  priceNow: number | null;
  priceChange: number | null;
  ratingCountGrowth: number | null;
  newCompetitors: number | null;
  spike: boolean;
  seasonality: string;
  spanDays: number;
  snapshotCount: number;
  classification: TrendClass;
  reasons: string[];
}

export function computeTrend(listings: ListingSeries[], now: Date, periodDays: number, saturation: number | null): TrendMetrics {
  const n = now.getTime();
  const win = (a: number, b: number) => sumWindows(listings.map((l) => salesInWindow(l.snaps, new Date(n - a * DAY), new Date(n - b * DAY))));
  const all = listings.flatMap((l) => l.snaps);
  const times = all.map((s) => s.t.getTime());
  const spanDays = times.length ? (Math.max(...times) - Math.min(...times)) / DAY : 0;
  const salesPeriod = win(periodDays, 0);
  const salesPrevPeriod = win(periodDays * 2, periodDays);
  const sales7 = win(7, 0);
  const sales30 = win(30, 0);
  const growth7 = growth(sales7, win(14, 7));
  const growth30 = growth(sales30, win(60, 30));
  const acceleration = sales7 && sales30 && sales30.value > 0 ? sales7.value / 7 / (sales30.value / 30) - 1 : null;

  const latestPrices = listings.map((l) => nearestPrice(l.snaps, n, 7)).filter((p): p is number => p !== null);
  const pastPrices = listings.map((l) => nearestPrice(l.snaps, n - periodDays * DAY, Math.max(3, periodDays * 0.2))).filter((p): p is number => p !== null);
  const priceNow = median(latestPrices);
  const pricePast = median(pastPrices);
  const priceChange = priceNow !== null && pricePast ? priceNow / pricePast - 1 : null;

  const rc = (t: number) =>
    listings
      .map((l) => {
        const pts = l.snaps.filter((s) => s.ratingCount !== null).sort((a, b) => Math.abs(a.t.getTime() - t) - Math.abs(b.t.getTime() - t));
        return pts[0] && Math.abs(pts[0].t.getTime() - t) <= 7 * DAY ? (pts[0].ratingCount as number) : null;
      })
      .filter((v): v is number => v !== null);
  const rNow = rc(n);
  const rPast = rc(n - periodDays * DAY);
  const ratingCountGrowth = rNow.length && rPast.length && rPast.reduce((a, b) => a + b, 0) > 0 ? rNow.reduce((a, b) => a + b, 0) / rPast.reduce((a, b) => a + b, 0) - 1 : null;

  const monitoringStart = times.length ? Math.min(...times) : n;
  const newCompetitors = monitoringStart <= n - periodDays * DAY ? listings.filter((l) => l.firstSeenAt.getTime() > n - periodDays * DAY).length : null;

  // pico: vendas diárias do produto (soma dos anúncios) com um dia muito acima da mediana do período
  const rates: number[] = [];
  for (let d = Math.min(periodDays, Math.floor(spanDays)); d >= 1; d--) {
    const w = win(d, d - 1);
    if (w && w.observed) rates.push(w.value);
  }
  const medRate = median(rates);
  const spike = rates.length >= 7 && medRate !== null && medRate > 0 && Math.max(...rates) > TREND_CRITERIA.spikeFactor * medRate;

  const m: TrendMetrics = {
    periodDays,
    salesPeriod,
    salesPrevPeriod,
    growthPeriod: growth(salesPeriod, salesPrevPeriod),
    sales7,
    growth7,
    sales30,
    growth30,
    acceleration,
    priceNow,
    priceChange,
    ratingCountGrowth,
    newCompetitors,
    spike,
    seasonality: spanDays >= 365 ? "Histórico ≥ 1 ano: compare o mesmo período do ano anterior no gráfico." : `Sazonalidade não avaliável: histórico de ${Math.floor(spanDays)} dias (mínimo 365).`,
    spanDays,
    snapshotCount: all.length,
    classification: "insuficiente",
    reasons: [],
  };
  classify(m, saturation);
  return m;
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

export function classify(m: TrendMetrics, saturation: number | null) {
  const C = TREND_CRITERIA;
  const r = m.reasons;
  if (m.spanDays < C.minSpanDays || m.snapshotCount < C.minSnapshots) {
    m.classification = "insuficiente";
    r.push(`Histórico de ${Math.floor(m.spanDays)} dias e ${m.snapshotCount} snapshots (mínimo ${C.minSpanDays} dias e ${C.minSnapshots} snapshots).`);
    return;
  }
  const g7 = m.growth7;
  const g30 = m.growth30 ?? m.growthPeriod;
  if (g7 !== null && m.acceleration !== null && m.sales7 && g7 >= C.explosivo.growth7 && m.acceleration >= C.explosivo.acceleration && m.sales7.value >= C.explosivo.minSales7) {
    m.classification = "explosivo";
    r.push(`Vendas 7d +${pct(g7)} vs 7d anteriores (≥ ${pct(C.explosivo.growth7)}), aceleração ${pct(m.acceleration)} (≥ ${pct(C.explosivo.acceleration)}), ${Math.round(m.sales7.value)} vendas em 7d.`);
  } else if (g30 !== null && g30 <= C.queda.growth30) {
    m.classification = "queda";
    r.push(`Vendas do período ${pct(g30)} vs período anterior (≤ ${pct(C.queda.growth30)}).`);
  } else if (saturation !== null && saturation >= C.saturado.saturation && m.priceChange !== null && m.priceChange <= C.saturado.priceChange) {
    m.classification = "saturado";
    r.push(`Saturação ${saturation.toFixed(0)}/100 (≥ ${C.saturado.saturation}) e preço mediano ${pct(m.priceChange)} (≤ ${pct(C.saturado.priceChange)}).`);
  } else if (g30 !== null && g30 >= C.crescimento.growth30) {
    m.classification = "crescimento";
    r.push(`Vendas do período +${pct(g30)} vs período anterior (≥ ${pct(C.crescimento.growth30)}).`);
  } else if (g30 !== null) {
    m.classification = "estavel";
    r.push(`Variação de vendas de ${pct(g30)} (entre ${pct(C.queda.growth30)} e ${pct(C.crescimento.growth30)}).`);
  } else {
    m.classification = "insuficiente";
    r.push("Não há dois períodos consecutivos com cobertura de dados para comparar.");
  }
  if (m.spike) r.push("Atenção: possível pico temporário de demanda (ritmo diário > 3× a mediana).");
}

// Série diária para gráficos (vendas derivadas do acumulado e preço mediano). Dias sem dados = null.
export function dailySeries(listings: ListingSeries[], now: Date, days: number) {
  const out: { date: string; vendas: number | null; preco: number | null }[] = [];
  for (let d = days; d >= 1; d--) {
    const end = new Date(now.getTime() - (d - 1) * DAY);
    const start = new Date(end.getTime() - DAY);
    const w = sumWindows(listings.map((l) => salesInWindow(l.snaps, start, end)));
    const prices = listings.map((l) => nearestPrice(l.snaps, end.getTime(), 1)).filter((p): p is number => p !== null);
    out.push({ date: end.toISOString().slice(0, 10), vendas: w && w.observed ? Math.round(w.value * 10) / 10 : null, preco: median(prices) });
  }
  return out;
}
