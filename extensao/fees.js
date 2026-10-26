// Cópia do motor de tarifas (src/lib/fees.ts) para uso no navegador.
// As REGRAS vêm sempre do servidor (tabela vigente); aqui só o cálculo.
(function (g) {
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  function computeFees(price, rules, cpfHighVolume) {
    const base = round2(Math.max(0, price));
    let idx = 0;
    rules.bands.forEach((b, i) => {
      if (base >= b.min) idx = i;
    });
    const band = rules.bands[idx];
    let fixed = band.fixed;
    if (rules.lowPrice && base < rules.lowPrice.below) fixed = base * rules.lowPrice.fixedFractionOfPrice;
    const cpf = cpfHighVolume && rules.cpfSurcharge ? rules.cpfSurcharge.amount : 0;
    const commission = round2(base * band.pct);
    fixed = round2(fixed);
    return { pct: band.pct, commission, fixed, cpfSurcharge: cpf, total: round2(commission + fixed + cpf) };
  }

  // Margem de contribuição por venda com os custos padrão da conta.
  function margin(price, unitCost, d, rules) {
    const f = computeFees(price, rules, d.sellerType === "CPF" && d.cpfHighVolume);
    const pctCosts = price * ((d.taxPct + d.adsPct + d.lossPct) / 100);
    const value = round2(price - f.total - unitCost - d.packagingCost - d.shippingCost - d.otherVariableCost - pctCosts);
    return { fees: f, value, pct: price > 0 ? value / price : 0 };
  }

  g.HunterFees = { computeFees, margin, round2 };
})(globalThis);
