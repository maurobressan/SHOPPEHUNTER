// Simulador de compra de lote: quanto dinheiro fica "preso", quando volta e quanto sobra.
// O ritmo de vendas é uma HIPÓTESE do usuário (não previsão). A Shopee repassa o valor
// alguns dias após a entrega: o prazo de repasse é configurável.

export interface LotInput {
  lotUnits: number;
  unitCost: number; // preço do fornecedor por unidade
  freight: number; // frete do lote
  otherUpfront: number; // outros custos iniciais (fotos, embalagens em lote...)
  netPerSale: number; // valor que entra por venda: receita − tarifas − custos variáveis (exceto mercadoria)
  salesPerMonth: number; // hipótese
  payoutDelayDays: number; // dias entre a venda e o dinheiro disponível
  horizonDays?: number;
}

export interface LotResult {
  investment: number;
  daysToSellOut: number | null;
  paybackDay: number | null; // dia em que o caixa volta a zero
  totalReturn: number; // entradas totais ao vender o lote inteiro
  profit: number; // totalReturn − investimento
  roi: number;
  monthlyRoi: number | null; // ROI proporcional a 30 dias de ciclo
  series: { day: number; caixa: number }[];
}

export function simulateLot(i: LotInput): LotResult {
  const investment = i.lotUnits * i.unitCost + i.freight + i.otherUpfront;
  const perDay = i.salesPerMonth / 30;
  const daysToSellOut = perDay > 0 ? Math.ceil(i.lotUnits / perDay) : null;
  const horizon = i.horizonDays ?? Math.min(365, Math.max(60, (daysToSellOut ?? 60) + i.payoutDelayDays + 10));
  const series: { day: number; caixa: number }[] = [];
  let cash = -investment;
  let sold = 0;
  let paybackDay: number | null = investment <= 0 ? 0 : null;
  const pending: number[] = [];
  for (let d = 0; d <= horizon; d++) {
    if (d > 0 && perDay > 0 && sold < i.lotUnits) {
      const today = Math.min(perDay, i.lotUnits - sold);
      sold += today;
      pending[d + i.payoutDelayDays] = (pending[d + i.payoutDelayDays] ?? 0) + today * i.netPerSale;
    }
    cash += pending[d] ?? 0;
    if (paybackDay === null && cash >= 0) paybackDay = d;
    series.push({ day: d, caixa: Math.round(cash * 100) / 100 });
  }
  const totalReturn = i.lotUnits * i.netPerSale;
  const profit = totalReturn - investment;
  const roi = investment > 0 ? profit / investment : 0;
  const cycle = daysToSellOut !== null ? daysToSellOut + i.payoutDelayDays : null;
  return {
    investment,
    daysToSellOut,
    paybackDay,
    totalReturn,
    profit,
    roi,
    monthlyRoi: cycle && cycle > 0 ? roi * (30 / cycle) : null,
    series,
  };
}
