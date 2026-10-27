import { describe, expect, it } from "vitest";
import { adsBreakEven } from "../src/lib/ads";
import { restockPlan, type StockLine } from "../src/lib/restock";
import { readFileSync } from "node:fs";

describe("segurança", () => {
  it("o token da extensão não é colocado no endereço da página", () => {
    const src = readFileSync("src/app/actions/account.ts", "utf8");
    expect(src).not.toMatch(/token=\$\{/);
  });
  it("o limite de tentativas é guardado no banco e sempre aguardado", () => {
    expect(readFileSync("src/lib/auth.ts", "utf8")).toContain("prisma.rateLimit");
    const actions = readFileSync("src/app/actions/auth.ts", "utf8");
    expect(actions.match(/tooManyAttempts\(/g)!.length).toBe(actions.match(/await tooManyAttempts\(/g)!.length);
  });
});

describe("Shopee Ads", () => {
  it("ROAS e gasto máximo por venda a partir da margem sem anúncio", () => {
    // venda de R$ 50 com R$ 12,50 de margem antes dos anúncios
    const r = adsBreakEven({ revenue: 50, marginBeforeAds: 12.5, targetProfit: 5 });
    expect(r.maxCostPerSale).toBe(12.5);
    expect(r.breakEvenRoas).toBeCloseTo(4); // 50 / 12,5
    expect(r.breakEvenAcos).toBeCloseTo(0.25);
    expect(r.targetCostPerSale).toBe(7.5);
    expect(r.targetRoas).toBeCloseTo(6.667, 2); // 50 / 7,5
  });

  it("CPC máximo e gasto por venda usam a conversão informada", () => {
    const r = adsBreakEven({ revenue: 50, marginBeforeAds: 12.5, targetProfit: 5, conversionPct: 4, cpc: 0.4 });
    expect(r.maxCpc).toBe(0.3); // 7,50 × 4%
    expect(r.costPerSaleNow).toBe(10); // 0,40 ÷ 4%
  });

  it("resultado diário da campanha com o ROAS atual", () => {
    const r = adsBreakEven({ revenue: 50, marginBeforeAds: 12.5, targetProfit: 0, campaignRoas: 5, dailyBudget: 20 });
    expect(r.campaign!.salesPerDay).toBeCloseTo(2); // 20 × 5 ÷ 50
    expect(r.campaign!.profitPerDay).toBe(5); // 2 × 12,5 − 20
    expect(r.campaign!.profitPerSale).toBe(2.5); // 12,5 − 50/5
  });

  it("sem margem, não recomenda gastar nada", () => {
    const r = adsBreakEven({ revenue: 30, marginBeforeAds: -1, targetProfit: 0 });
    expect(r.maxCostPerSale).toBeNull();
    expect(r.warnings[0]).toMatch(/prejuízo/);
  });
});

describe("estoque e reposição", () => {
  const d = (s: string) => new Date(s + "T12:00:00");
  // 60 unidades concluídas em 30 dias (2/dia) + 1 cancelada que não conta
  const lines: StockLine[] = [
    ...Array.from({ length: 30 }, (_, i) => ({ sku: "A", productName: "Garrafa", orderDate: new Date(d("2026-10-01").getTime() + i * 86400000), status: "concluido", quantity: 2 })),
    { sku: "A", productName: "Garrafa", orderDate: d("2026-10-30"), status: "cancelado", quantity: 5 },
    { sku: "B", productName: "Copo", orderDate: d("2026-10-20"), status: "concluido", quantity: 3 },
  ];

  it("ritmo, estoque estimado, data em que acaba e até quando pedir", () => {
    const { rows } = restockPlan(lines, { A: { quantity: 100, leadTimeDays: 10, countedAt: d("2026-10-26") } }, { today: d("2026-10-31") });
    const a = rows.find((r) => r.sku === "A")!;
    expect(a.perDay).toBe(2);
    expect(a.soldSinceCount).toBe(10); // 26 a 30/10 (5 dias), 2 por dia; o cancelado não conta
    expect(a.estimatedNow).toBe(90);
    // acaba 45 dias depois do último pedido importado (30/10) → 14/12; pedir até 14/12 − 10 − 7 = 27/11
    expect(a.runsOutAt!.toISOString().slice(0, 10)).toBe("2026-12-14");
    expect(a.orderBy!.toISOString().slice(0, 10)).toBe("2026-11-27");
    expect(a.suggestedQty).toBe(0); // 2 × (10 + 30) = 80 ≤ 90
    expect(a.status).toBe("ok");
  });

  it("pede agora quando o prazo já passou e sugere a quantidade", () => {
    const { rows } = restockPlan(lines, { A: { quantity: 30, leadTimeDays: 15, countedAt: d("2026-10-30") } }, { today: d("2026-10-31") });
    const a = rows[0];
    expect(a.sku).toBe("A");
    expect(a.status).toBe("pedir_agora");
    expect(a.suggestedQty).toBe(2 * 45 - 28); // vendeu 2 em 30/10 depois da contagem
  });

  it("SKU sem contagem aparece pedindo o estoque", () => {
    const { rows } = restockPlan(lines, {});
    expect(rows.find((r) => r.sku === "B")!.status).toBe("sem_contagem");
  });
});
