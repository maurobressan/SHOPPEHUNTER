import { describe, expect, it } from "vitest";
import { salesInWindow, computeTrend, type SnapPoint, type ListingSeries } from "@/lib/trends";
import { analyzeCompetition, type CompListing } from "@/lib/competition";
import { groupSimilar, jaccard, tokens } from "@/lib/similarity";
import { hunterScore } from "@/lib/hunter-score";
import { SHOPEE_BR_2026_10 as R } from "@/lib/fees";

const DAY = 86400000;
const now = new Date(2026, 9, 26);
const snap = (daysAgo: number, cum: number, price = 30): SnapPoint => ({ t: new Date(now.getTime() - daysAgo * DAY), price, salesCumulative: cum, ratingCount: null, ratingStar: 4.8 });

describe("vendas por período a partir do acumulado", () => {
  it("diferença observada entre snapshots", () => {
    const s = [snap(30, 1000), snap(15, 1300), snap(0, 1600)];
    const w = salesInWindow(s, new Date(now.getTime() - 30 * DAY), now)!;
    expect(w.value).toBe(600);
    expect(w.observed).toBe(true);
  });
  it("interpola dentro do período", () => {
    const s = [snap(30, 1000), snap(0, 1600)];
    expect(salesInWindow(s, new Date(now.getTime() - 7 * DAY), now)!.value).toBeCloseTo(140);
  });
  it("cobertura parcial vira estimativa com confiança", () => {
    const s = [snap(20, 1000), snap(0, 1200)];
    const w = salesInWindow(s, new Date(now.getTime() - 30 * DAY), now)!;
    expect(w.observed).toBe(false);
    expect(w.confidence).toBeCloseTo(2 / 3);
    expect(w.value).toBeCloseTo(300);
  });
  it("sem cobertura suficiente ou acumulado decrescente → null", () => {
    expect(salesInWindow([snap(5, 100), snap(0, 120)], new Date(now.getTime() - 30 * DAY), now)).toBeNull();
    expect(salesInWindow([snap(30, 500), snap(0, 400)], new Date(now.getTime() - 30 * DAY), now)).toBeNull();
    expect(salesInWindow([snap(0, 500)], new Date(now.getTime() - 30 * DAY), now)).toBeNull();
  });
});

function series(rateFn: (dayAgo: number) => number, days = 60): ListingSeries {
  const snaps: SnapPoint[] = [];
  let cum = 0;
  for (let d = days; d >= 0; d--) {
    cum += rateFn(d);
    snaps.push(snap(d, Math.round(cum)));
  }
  return { id: "x", firstSeenAt: new Date(now.getTime() - days * DAY), snaps };
}

describe("classificação de tendências", () => {
  it("dados insuficientes", () => {
    const t = computeTrend([{ id: "a", firstSeenAt: now, snaps: [snap(3, 10), snap(0, 20)] }], now, 30, null);
    expect(t.classification).toBe("insuficiente");
  });
  it("estável", () => {
    expect(computeTrend([series(() => 10, 120)], now, 30, 30).classification).toBe("estavel");
  });
  it("crescimento", () => {
    expect(computeTrend([series((d) => (d < 30 ? 13 : 10), 120)], now, 30, 30).classification).toBe("crescimento");
  });
  it("explosivo", () => {
    const t = computeTrend([series((d) => (d < 7 ? 30 : 10), 120)], now, 30, 30);
    expect(t.classification).toBe("explosivo");
  });
  it("pico temporário só quando um dia foge da mediana do próprio produto", () => {
    expect(computeTrend([series(() => 10, 120), series(() => 100, 120)], now, 30, 30).spike).toBe(false);
    expect(computeTrend([series((d) => (d === 3 ? 80 : 10), 120)], now, 30, 30).spike).toBe(true);
  });
  it("queda", () => {
    expect(computeTrend([series((d) => (d < 30 ? 6 : 10), 120)], now, 30, 30).classification).toBe("queda");
  });
});

describe("concorrência", () => {
  const L = (i: number, price: number, sales: number, shop = `s${i}`, rating = 4.8): CompListing => ({
    id: String(i), title: "t", shopId: shop, shopName: shop, url: "", price, salesCumulative: sales, ratingStar: rating, ratingCount: null, weakPhotos: false, weakDescription: false,
  });
  it("estatísticas de preço e concentração", () => {
    const c = analyzeCompetition([L(1, 20, 900, "a"), L(2, 30, 50, "b"), L(3, 40, 50, "c"), L(4, 25, 0, "d", 4.0)], R);
    expect(c.price!.median).toBe(27.5);
    expect(c.price!.spreadPct).toBe(1);
    expect(c.top3ShopShare).toBe(1);
    expect(c.saturation).toBeGreaterThan(0);
    expect(c.kitIdeas[0].saving).toBeGreaterThan(0);
  });
  it("sem anúncios suficientes não calcula saturação", () => {
    expect(analyzeCompetition([L(1, 20, 1)], R).saturation).toBeNull();
  });
});

describe("similaridade", () => {
  it("agrupa títulos equivalentes", () => {
    expect(jaccard(tokens("Garrafa Térmica Inox 500ml Preta"), tokens("Garrafa Termica 500ml Inox"))).toBeGreaterThanOrEqual(0.5);
    const g = groupSimilar([
      { id: "1", title: "Garrafa Térmica Inox 500ml", price: 39 },
      { id: "2", title: "Kit Garrafa Termica 500 ml Inox", price: 42 },
      { id: "3", title: "Fone Bluetooth TWS", price: 40 },
    ]);
    expect(g[0].map((x) => x.id).sort()).toEqual(["1", "2"]);
  });
});

describe("Hunter Score", () => {
  const base = { sales: { value: 600, observed: true, confidence: 1 }, periodDays: 30, growth: 0.3, saturation: 40, marginPct: 0.28, suppliersWithPrice: 2, suppliersOnRequest: 1, spike: false, spanDays: 90, investment: 500 };
  it("produto completo e bom → comprar para testar", () => {
    const r = hunterScore(base);
    expect(r.confirmed).toBe(true);
    expect(r.score!).toBeGreaterThan(65);
    expect(r.recommendation).toBe("Comprar para testar");
    expect(r.factors.reduce((s, f) => s + f.contribution, 0)).toBeCloseTo(r.score!);
  });
  it("sem margem conhecida não é confirmado", () => {
    const r = hunterScore({ ...base, marginPct: null });
    expect(r.confirmed).toBe(false);
    expect(r.recommendation).toBe("Monitorar");
  });
  it("margem negativa → evitar", () => {
    expect(hunterScore({ ...base, marginPct: -0.05 }).recommendation).toBe("Evitar no momento");
  });
  it("pesos configuráveis alteram o score", () => {
    const a = hunterScore(base).score!;
    const b = hunterScore(base, { demand: 0, growth: 0, competition: 0, margin: 100, suppliers: 0 }).score!;
    expect(b).toBeCloseTo(80);
    expect(a).not.toBeCloseTo(b);
  });
});
