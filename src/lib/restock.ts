// Estoque e reposição por SKU, a partir das planilhas de pedidos importadas.
// Ritmo de vendas = unidades não canceladas nos 30 dias que terminam no pedido mais recente importado.
// Estoque estimado = contagem informada − unidades vendidas depois da contagem (pelas planilhas).

export interface StockLine {
  sku: string;
  productName: string;
  orderDate: Date;
  status: string;
  quantity: number;
}

export interface StockInfo {
  quantity: number;
  leadTimeDays: number;
  countedAt: Date;
}

export type RestockStatus = "sem_estoque" | "pedir_agora" | "pedir_em_breve" | "ok" | "sem_vendas" | "sem_contagem";

export interface RestockRow {
  sku: string;
  productName: string;
  unitsWindow: number; // unidades vendidas na janela
  perDay: number;
  stock: StockInfo | null;
  soldSinceCount: number | null;
  estimatedNow: number | null;
  runsOutAt: Date | null; // quando o estoque estimado acaba
  orderBy: Date | null; // último dia para pedir (considerando prazo + margem de segurança)
  suggestedQty: number | null; // para cobrir o prazo + `coverDays` dias depois da chegada
  status: RestockStatus;
}

const DAY = 86400000;
const counts = (status: string) => status !== "cancelado";

export function restockPlan(
  lines: StockLine[],
  stocks: Record<string, StockInfo>,
  opts: { windowDays?: number; safetyDays?: number; coverDays?: number; today?: Date } = {},
): { rows: RestockRow[]; windowFrom: Date | null; windowTo: Date | null } {
  const windowDays = opts.windowDays ?? 30;
  const safety = opts.safetyDays ?? 7;
  const cover = opts.coverDays ?? 30;
  const today = opts.today ?? new Date();
  if (!lines.length && !Object.keys(stocks).length) return { rows: [], windowFrom: null, windowTo: null };
  const to = lines.length ? new Date(Math.max(...lines.map((l) => l.orderDate.getTime()))) : null;
  const from = to ? new Date(to.getTime() - windowDays * DAY) : null;

  const bySku = new Map<string, { name: string; window: number; lines: StockLine[] }>();
  for (const l of lines) {
    const e = bySku.get(l.sku) ?? { name: l.productName, window: 0, lines: [] };
    e.lines.push(l);
    if (counts(l.status) && from && l.orderDate > from) e.window += l.quantity;
    bySku.set(l.sku, e);
  }
  for (const sku of Object.keys(stocks)) if (!bySku.has(sku)) bySku.set(sku, { name: "", window: 0, lines: [] });

  const rows: RestockRow[] = [...bySku.entries()].map(([sku, e]) => {
    const perDay = e.window / windowDays;
    const stock = stocks[sku] ?? null;
    const base: RestockRow = { sku, productName: e.name, unitsWindow: e.window, perDay, stock, soldSinceCount: null, estimatedNow: null, runsOutAt: null, orderBy: null, suggestedQty: null, status: "sem_contagem" };
    if (!stock) return base;
    const sold = e.lines.filter((l) => counts(l.status) && l.orderDate >= stock.countedAt).reduce((s, l) => s + l.quantity, 0);
    const now = Math.max(0, stock.quantity - sold);
    base.soldSinceCount = sold;
    base.estimatedNow = now;
    if (perDay <= 0) return { ...base, status: now === 0 ? "sem_estoque" : "sem_vendas" };
    // o estoque é consumido a partir da última informação disponível (contagem ou último pedido importado)
    const ref = to && to > stock.countedAt ? to : stock.countedAt;
    const runsOutAt = new Date(ref.getTime() + (now / perDay) * DAY);
    const orderBy = new Date(runsOutAt.getTime() - (stock.leadTimeDays + safety) * DAY);
    const suggestedQty = Math.max(0, Math.ceil(perDay * (stock.leadTimeDays + cover)) - now);
    const status: RestockStatus = now === 0 ? "sem_estoque" : orderBy <= today ? "pedir_agora" : orderBy.getTime() - today.getTime() <= 7 * DAY ? "pedir_em_breve" : "ok";
    return { ...base, runsOutAt, orderBy, suggestedQty, status };
  });

  const order: RestockStatus[] = ["sem_estoque", "pedir_agora", "pedir_em_breve", "ok", "sem_contagem", "sem_vendas"];
  rows.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.perDay - a.perDay);
  return { rows, windowFrom: from, windowTo: to };
}
