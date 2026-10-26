// Motor de tarifas da Shopee. Puro e determinístico: recebe as regras (versionadas no banco)
// e o preço do item, devolve a decomposição das tarifas.

export interface FeeBand {
  min: number; // preço mínimo da faixa (inclusive)
  pct: number; // comissão percentual (0.20 = 20%) — já inclui taxa de transação
  fixed: number; // tarifa fixa por item vendido (R$)
  pixSubsidyPct?: number; // custeado pela Shopee: não altera o repasse ao vendedor
}

export interface FeeRules {
  bands: FeeBand[];
  // Abaixo de "below", a tarifa fixa passa a ser fraction × preço (ex.: metade do preço abaixo de R$ 9).
  lowPrice?: { below: number; fixedFractionOfPrice: number };
  // Adicional por item para CPF com volume acima do limite.
  cpfSurcharge?: { amount: number; ordersThreshold: number; periodDays: number; regressiveBelow?: number };
}

export interface FeeOptions {
  cpfHighVolume?: boolean; // CPF com mais pedidos que o limite no período
}

export interface FeeBreakdown {
  base: number; // valor sobre o qual a comissão incide
  bandIndex: number;
  bandLabel: string;
  pct: number;
  commission: number;
  fixed: number;
  cpfSurcharge: number;
  total: number;
  warnings: string[];
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function findBand(rules: FeeRules, price: number): number {
  const p = round2(price);
  let idx = 0;
  rules.bands.forEach((b, i) => {
    if (p >= b.min) idx = i;
  });
  return idx;
}

export function bandLabel(rules: FeeRules, i: number): string {
  const b = rules.bands[i];
  const next = rules.bands[i + 1];
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return next ? `${brl(b.min)} a ${brl(next.min - 0.01)}` : `a partir de ${brl(b.min)}`;
}

export function computeFees(price: number, rules: FeeRules, opts: FeeOptions = {}): FeeBreakdown {
  const warnings: string[] = [];
  const base = round2(Math.max(0, price));
  const i = findBand(rules, base);
  const band = rules.bands[i];
  let fixed = band.fixed;
  if (rules.lowPrice && base < rules.lowPrice.below) {
    fixed = base * rules.lowPrice.fixedFractionOfPrice;
    warnings.push(
      `Preço abaixo de R$ ${rules.lowPrice.below.toFixed(2)}: tarifa fixa = ${(rules.lowPrice.fixedFractionOfPrice * 100).toFixed(0)}% do preço.`,
    );
  }
  let cpf = 0;
  if (opts.cpfHighVolume && rules.cpfSurcharge) {
    cpf = rules.cpfSurcharge.amount;
    if (rules.cpfSurcharge.regressiveBelow && base < rules.cpfSurcharge.regressiveBelow) {
      warnings.push(
        `Para CPF, abaixo de R$ ${rules.cpfSurcharge.regressiveBelow.toFixed(2)} a Shopee aplica estrutura regressiva não detalhada publicamente; usamos o adicional cheio (cálculo conservador).`,
      );
    }
  }
  const commission = round2(base * band.pct);
  fixed = round2(fixed);
  return {
    base,
    bandIndex: i,
    bandLabel: bandLabel(rules, i),
    pct: band.pct,
    commission,
    fixed,
    cpfSurcharge: cpf,
    total: round2(commission + fixed + cpf),
    warnings,
  };
}

// Regras oficiais vigentes desde 01/10/2026 (Centro de Educação do Vendedor, artigo 26839).
export const SHOPEE_BR_2026_10: FeeRules = {
  bands: [
    { min: 0, pct: 0.2, fixed: 4.5 },
    { min: 80, pct: 0.14, fixed: 16, pixSubsidyPct: 0.05 },
    { min: 100, pct: 0.14, fixed: 20, pixSubsidyPct: 0.05 },
    { min: 200, pct: 0.14, fixed: 26, pixSubsidyPct: 0.05 },
    { min: 500, pct: 0.14, fixed: 26, pixSubsidyPct: 0.08 },
  ],
  lowPrice: { below: 9, fixedFractionOfPrice: 0.5 },
  cpfSurcharge: { amount: 3, ordersThreshold: 450, periodDays: 90, regressiveBelow: 12 },
};

// Versão anterior (até 30/09/2026): tarifa fixa de R$ 4,00 na primeira faixa e limite de R$ 8.
export const SHOPEE_BR_2026_03: FeeRules = {
  ...SHOPEE_BR_2026_10,
  bands: SHOPEE_BR_2026_10.bands.map((b, i) => (i === 0 ? { ...b, fixed: 4 } : b)),
  lowPrice: { below: 8, fixedFractionOfPrice: 0.5 },
};

export const OFFICIAL_SOURCE = {
  url: "https://seller.shopee.com.br/edu/article/26839",
  title: "Confira a Política de Comissão para vendedores CNPJ e CPF (Shopee BR, atualizado em 01/10/2026)",
};
