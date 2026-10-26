import { describe, expect, it, beforeAll } from "vitest";
import { effectivePlanId, parseLimits, withinLimit, DEFAULT_PLANS } from "@/lib/plans";
import { hashPassword, verifyPassword, passwordProblem, validEmail } from "@/lib/crypto";
import { simulateLot } from "@/lib/cashflow";
import { parseShopeeUrl, captureSchema } from "@/lib/ext";
import { computeFees, SHOPEE_BR_2026_10 as R } from "@/lib/fees";

const DAY = 86400000;

describe("planos e assinatura", () => {
  const now = new Date(2026, 9, 26);
  it("plano efetivo", () => {
    expect(effectivePlanId(null, now)).toBe("gratis");
    expect(effectivePlanId({ status: "active", planId: "pro", trialEndsAt: null, currentPeriodEnd: null }, now)).toBe("pro");
    expect(effectivePlanId({ status: "trialing", planId: "pro", trialEndsAt: new Date(now.getTime() + DAY), currentPeriodEnd: null }, now)).toBe("pro");
    expect(effectivePlanId({ status: "trialing", planId: "pro", trialEndsAt: new Date(now.getTime() - DAY), currentPeriodEnd: null }, now)).toBe("gratis");
    // cancelado mantém acesso até o fim do período pago (+3 dias de tolerância)
    expect(effectivePlanId({ status: "canceled", planId: "business", trialEndsAt: null, currentPeriodEnd: new Date(now.getTime() + 5 * DAY) }, now)).toBe("business");
    expect(effectivePlanId({ status: "past_due", planId: "pro", trialEndsAt: null, currentPeriodEnd: new Date(now.getTime() - 4 * DAY) }, now)).toBe("gratis");
  });
  it("limites", () => {
    expect(withinLimit(2, 3)).toBe(true);
    expect(withinLimit(3, 3)).toBe(false);
    expect(withinLimit(9999, -1)).toBe(true);
    expect(parseLimits("lixo").products).toBe(DEFAULT_PLANS[0].limits.products);
    expect(parseLimits(JSON.stringify({ products: 7 })).products).toBe(7);
  });
});

describe("senhas", () => {
  it("hash e verificação", async () => {
    const h = await hashPassword("segredo123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("segredo123", h)).toBe(true);
    expect(await verifyPassword("errada123", h)).toBe(false);
    expect(await verifyPassword("x", "formato-invalido")).toBe(false);
  });
  it("regras de senha e e-mail", () => {
    expect(passwordProblem("curta1")).not.toBeNull();
    expect(passwordProblem("somenteletras")).not.toBeNull();
    expect(passwordProblem("boa12345")).toBeNull();
    expect(validEmail("ana@loja.com.br")).toBe(true);
    expect(validEmail("ana@loja")).toBe(false);
  });
});

describe("fluxo de caixa do lote", () => {
  it("investimento, retorno e dia de payback", () => {
    // 30 un. a R$ 10 + R$ 30 de frete = R$ 330; entra R$ 25 por venda; 30 vendas/mês (1/dia); repasse 10 dias
    const r = simulateLot({ lotUnits: 30, unitCost: 10, freight: 30, otherUpfront: 0, netPerSale: 25, salesPerMonth: 30, payoutDelayDays: 10 });
    expect(r.investment).toBe(330);
    expect(r.daysToSellOut).toBe(30);
    expect(r.totalReturn).toBe(750);
    expect(r.profit).toBe(420);
    // precisa de 14 vendas (14×25=350 ≥ 330); a 14ª venda é no dia 14 e o dinheiro chega no dia 24
    expect(r.paybackDay).toBe(24);
    expect(r.series[0].caixa).toBe(-330);
  });
  it("sem vendas o dinheiro não volta", () => {
    const r = simulateLot({ lotUnits: 10, unitCost: 5, freight: 0, otherUpfront: 0, netPerSale: 10, salesPerMonth: 0, payoutDelayDays: 7 });
    expect(r.paybackDay).toBeNull();
    expect(r.daysToSellOut).toBeNull();
  });
});

describe("integração com a extensão", () => {
  beforeAll(async () => {
    // arquivos JS puros da extensão (sem tipos): registram HunterFees/HunterParse em globalThis
    // @ts-expect-error módulo JS sem declaração de tipos
    await import("../extensao/fees.js");
    // @ts-expect-error módulo JS sem declaração de tipos
    await import("../extensao/parse.js");
  });
  const g = globalThis as unknown as {
    HunterParse: { parseText: (t: string) => { price: number | null; priceMax: number | null; sold: number | null; soldApprox: boolean; ratingStar: number | null; ratingCount: number | null }; isProductUrl: (u: string) => boolean; cleanTitle: (t: string) => string };
    HunterFees: { computeFees: (p: number, r: typeof R, cpf: boolean) => { total: number } };
  };

  it("lê preço, vendidos e avaliações do texto da página", () => {
    const t = g.HunterParse.parseText("Garrafa Térmica Inox 500ml\n4.8\n2,3mil Avaliações\n1,2mil Vendidos\nR$29,90 - R$49,90\nFrete grátis");
    expect(t.price).toBe(29.9);
    expect(t.priceMax).toBe(49.9);
    expect(t.sold).toBe(1200);
    expect(t.soldApprox).toBe(true);
    expect(t.ratingCount).toBe(2300);
    expect(t.ratingStar).toBe(4.8);
    const t2 = g.HunterParse.parseText("Copo\nR$ 19,90\n856 vendidos");
    expect(t2.price).toBe(19.9);
    expect(t2.sold).toBe(856);
    expect(t2.soldApprox).toBe(false);
  });

  it("lê os cartões de uma busca: vendidos totais, por mês e arredondados", () => {
    const P = (g as unknown as { HunterParse: { parseCard: (t: string, h: string, a?: string) => Record<string, unknown> } }).HunterParse;
    const a = P.parseCard("Indicado\n-20%\nGarrafa Térmica Inox 1L Café\nR$\n29,90\n1,2mil vendidos\nSão Paulo", "https://shopee.com.br/Garrafa-i.11.22");
    expect(a).toMatchObject({ shopId: "11", itemId: "22", title: "Garrafa Térmica Inox 1L Café", price: 29.9, sold: 1200, soldMonthly: null, soldApprox: true });
    const b = P.parseCard("Copo térmico 500ml\nR$ 19,90\n85 vendidos/mês", "https://shopee.com.br/product/7/8", "Copo térmico 500ml com tampa");
    expect(b).toMatchObject({ title: "Copo térmico 500ml com tampa", price: 19.9, sold: null, soldMonthly: 85, soldApprox: false });
    const c = P.parseCard("Luminária LED de mesa\nR$ 45,00", "https://shopee.com.br/Lum-i.1.2");
    expect(c).toMatchObject({ sold: null, soldMonthly: null });
  });

  it("identifica página de anúncio e limpa o título", () => {
    expect(g.HunterParse.isProductUrl("https://shopee.com.br/Garrafa-i.123.456")).toBe(true);
    expect(g.HunterParse.isProductUrl("https://shopee.com.br/search?keyword=x")).toBe(false);
    expect(g.HunterParse.cleanTitle("Garrafa Inox | Shopee Brasil")).toBe("Garrafa Inox");
    expect(parseShopeeUrl("https://shopee.com.br/Garrafa-Termica-i.123.456?sp=1")).toEqual({ shopId: "123", itemId: "456" });
    expect(parseShopeeUrl("https://shopee.com.br/product/77/88")).toEqual({ shopId: "77", itemId: "88" });
  });

  it("cálculo de tarifas da extensão é idêntico ao do servidor", () => {
    for (const p of [5, 8.99, 9, 39.9, 79.99, 80, 99.99, 100, 199.99, 200, 750]) {
      expect(g.HunterFees.computeFees(p, R, false).total).toBe(computeFees(p, R).total);
      expect(g.HunterFees.computeFees(p, R, true).total).toBe(computeFees(p, R, { cpfHighVolume: true }).total);
    }
  });

  it("valida dados enviados pela extensão", () => {
    const ok = captureSchema.safeParse({ url: "https://shopee.com.br/x-i.1.2", title: "Produto", price: 10, sold: 5, ratingStar: 4.5, ratingCount: 3 });
    expect(ok.success).toBe(true);
    expect(captureSchema.safeParse({ url: "https://evil.com/x-i.1.2", title: "Produto", price: 10, sold: 5, ratingStar: 4.5, ratingCount: 3 }).success).toBe(false);
    expect(captureSchema.safeParse({ url: "https://shopee.com.br/x-i.1.2", title: "Produto", price: -1, sold: 5, ratingStar: 9, ratingCount: 3 }).success).toBe(false);
  });
});
