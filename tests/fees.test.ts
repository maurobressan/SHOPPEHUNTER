import { describe, expect, it } from "vitest";
import { computeFees, SHOPEE_BR_2026_10 as R, SHOPEE_BR_2026_03 } from "@/lib/fees";
import { calculate, DEFAULT_INPUT, solvePrice, priceTests, breakEvenPrice } from "@/lib/calculator";

describe("comissões Shopee out/2026", () => {
  it("faixa até R$ 79,99: 20% + R$ 4,50", () => {
    const f = computeFees(39.9, R);
    expect(f.commission).toBe(7.98);
    expect(f.fixed).toBe(4.5);
    expect(f.total).toBe(12.48);
  });

  it("mudança de faixa em R$ 80", () => {
    expect(computeFees(79.99, R).total).toBe(20.5); // 16,00 + 4,50
    const f80 = computeFees(80, R);
    expect(f80.pct).toBe(0.14);
    expect(f80.total).toBe(27.2); // 11,20 + 16
  });

  it("faixas de R$ 100, R$ 200 e R$ 500", () => {
    expect(computeFees(99.99, R).fixed).toBe(16);
    expect(computeFees(100, R).fixed).toBe(20);
    expect(computeFees(199.99, R).fixed).toBe(20);
    expect(computeFees(200, R).fixed).toBe(26);
    expect(computeFees(1500, R).total).toBe(236); // sem teto: 210 + 26
  });

  it("abaixo de R$ 9 a tarifa fixa é metade do preço", () => {
    const f = computeFees(6, R);
    expect(f.fixed).toBe(3);
    expect(f.commission).toBe(1.2);
    expect(computeFees(9, R).fixed).toBe(4.5);
  });

  it("versão anterior: R$ 4,00 e limite em R$ 8", () => {
    expect(computeFees(39.9, SHOPEE_BR_2026_03).fixed).toBe(4);
    expect(computeFees(8.5, SHOPEE_BR_2026_03).fixed).toBe(4);
  });

  it("CPF acima de 450 pedidos/90 dias paga R$ 3 adicionais", () => {
    expect(computeFees(39.9, R, { cpfHighVolume: true }).total).toBe(15.48);
    expect(computeFees(39.9, R, { cpfHighVolume: false }).total).toBe(12.48);
    expect(computeFees(10, R, { cpfHighVolume: true }).warnings.length).toBeGreaterThan(0);
  });
});

describe("calculadora", () => {
  const base = { ...DEFAULT_INPUT, price: 39.9, unitCost: 12, packagingCost: 1.2, monthlyVolume: 100 };

  it("exemplo do enunciado: R$ 39,90, custo R$ 12, embalagem R$ 1,20", () => {
    const r = calculate(base, R);
    expect(r.fees.total).toBe(12.48);
    expect(r.netOfFees).toBe(27.42);
    expect(r.contributionMargin).toBe(14.22);
    expect(r.monthlyContribution).toBe(1422);
  });

  it("cupom do vendedor reduz a base da comissão sem dupla contagem", () => {
    const r = calculate({ ...base, sellerDiscountValue: 5 }, R);
    expect(r.revenueAfterDiscount).toBe(34.9);
    expect(r.fees.commission).toBe(6.98);
    expect(r.contributionMargin).toBe(round(34.9 - 6.98 - 4.5 - 13.2));
  });

  it("impostos, anúncios e perdas incidem sobre a receita após desconto", () => {
    const r = calculate({ ...base, taxPct: 6, adsPct: 5, lossPct: 2 }, R);
    expect(r.tax).toBe(2.39);
    expect(r.ads).toBe(2);
    expect(r.loss).toBe(0.8);
  });

  it("kit: custo multiplica, tarifa incide uma vez sobre o preço do kit", () => {
    const r = calculate({ ...base, price: 69.9, unitsPerListing: 3 }, R);
    expect(r.productCost).toBe(36);
    expect(r.fees.total).toBe(18.48); // 13,98 + 4,50
  });

  it("despesas fixas separadas da margem de contribuição", () => {
    const r = calculate({ ...base, fixedMonthly: 500 }, R);
    expect(r.contributionMargin).toBe(14.22);
    expect(r.fixedPerUnit).toBe(5);
    expect(r.profitPerUnit).toBe(9.22);
    expect(r.monthlyNetProfit).toBe(922);
  });

  it("reverso: lucro de R$ 10 por venda", () => {
    const p = solvePrice(base, R, { kind: "profit", value: 10 })!;
    expect(calculate({ ...base, price: p }, R).contributionMargin).toBeGreaterThanOrEqual(10);
    expect(calculate({ ...base, price: p - 0.01 }, R).contributionMargin).toBeLessThan(10);
  });

  it("reverso: margem de 20%", () => {
    const p = solvePrice(base, R, { kind: "margin", value: 20 })!;
    expect(calculate({ ...base, price: p }, R).contributionPct).toBeGreaterThanOrEqual(0.2);
    expect(calculate({ ...base, price: p - 0.01 }, R).contributionPct).toBeLessThan(0.2);
  });

  it("reverso considera salto de faixa em R$ 80 (devolve menor preço viável)", () => {
    const expensive = { ...base, unitCost: 45 };
    const p = solvePrice(expensive, R, { kind: "profit", value: 10 })!;
    // Abaixo de R$ 80: 75,87 − 15,17 − 4,50 − 46,20 = 10,00
    expect(p).toBe(75.87);
    const p2 = solvePrice(expensive, R, { kind: "profit", value: 15 })!;
    // R$ 79,99 rende 13,29; a partir de R$ 80 a faixa 14% + 16: P*0,86 − 62,2 ≥ 15 → P ≥ 89,77
    expect(p2).toBe(89.77);
  });

  it("meta impossível devolve null", () => {
    expect(solvePrice(base, R, { kind: "margin", value: 90 })).toBeNull();
  });

  it("ponto de equilíbrio", () => {
    const p = breakEvenPrice(base, R)!;
    expect(calculate({ ...base, price: p }, R).contributionMargin).toBeGreaterThanOrEqual(0);
    expect(calculate({ ...base, price: p - 0.01 }, R).contributionMargin).toBeLessThan(0);
  });

  it("teste de preços: melhor equilíbrio só com dados de concorrência", () => {
    const prices = [34.9, 39.9, 44.9, 49.9];
    expect(priceTests(base, prices, R, []).some((r) => r.best)).toBe(false);
    const rows = priceTests(base, prices, R, [35, 39, 42, 45, 48, 55]);
    // 44,90 fica exatamente na mediana (3 de 6 concorrentes ≤ 44,90) e tem a maior margem entre os elegíveis
    expect(rows.find((r) => r.best)?.price).toBe(44.9);
    expect(priceTests(base, prices, R, [30, 33, 36, 50]).find((r) => r.best)?.price).toBe(34.9);
  });
});

function round(n: number) {
  return Math.round(n * 100) / 100;
}
