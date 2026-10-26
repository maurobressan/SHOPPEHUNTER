// Relatório de vendas a partir dos pedidos importados.
import { computeFees, round2, type FeeRules } from "../fees";
import type { OrderStatus } from "./orders";

export interface ReportLine {
  orderId: string;
  orderDate: Date;
  status: OrderStatus | string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  sellerDiscount: number;
  shopeeDiscount: number;
  commissionFee: number | null;
  serviceFee: number | null;
  transactionFee: number | null;
  refundAmount: number;
}

export interface SkuRow {
  sku: string;
  productName: string;
  orders: number;
  units: number;
  gross: number;
  sellerDiscount: number;
  shopeeDiscount: number; // informativo: custeado pela Shopee
  fees: number;
  feesEstimated: boolean; // true se a planilha não trazia taxas e estimamos pela tabela vigente
  refunds: number;
  netRevenue: number; // bruto − desconto do vendedor − taxas − reembolsos
  cost: number | null;
  profit: number | null;
  cancelled: number;
  returned: number;
  pending: number;
}

export interface SalesReport {
  from: Date;
  to: Date;
  rows: SkuRow[];
  totals: Omit<SkuRow, "sku" | "productName" | "feesEstimated"> & { feesEstimatedAny: boolean; skusWithoutCost: number };
  notes: string[];
}

// Algumas exportações repetem taxas do pedido em todas as linhas de itens.
// Se o mesmo valor aparece em todas as linhas de um pedido com mais de um item, tratamos como taxa do
// pedido e rateamos proporcionalmente ao valor bruto, evitando dupla contagem.
export function allocateOrderFees(lines: ReportLine[]): { lines: ReportLine[]; adjustedOrders: number } {
  const byOrder = new Map<string, ReportLine[]>();
  lines.forEach((l) => byOrder.set(l.orderId, [...(byOrder.get(l.orderId) ?? []), l]));
  let adjusted = 0;
  const out: ReportLine[] = [];
  for (const group of byOrder.values()) {
    if (group.length < 2) {
      out.push(...group);
      continue;
    }
    const total = group.reduce((s, l) => s + l.grossAmount, 0) || 1;
    let touched = false;
    const copies = group.map((l) => ({ ...l }));
    for (const k of ["commissionFee", "serviceFee", "transactionFee"] as const) {
      const vals = group.map((l) => l[k]);
      if (vals.every((v) => v !== null && v === vals[0]) && (vals[0] ?? 0) > 0) {
        copies.forEach((c) => (c[k] = round2((vals[0] as number) * (c.grossAmount / total))));
        touched = true;
      }
    }
    if (touched) adjusted++;
    out.push(...copies);
  }
  return { lines: out, adjustedOrders: adjusted };
}

export function buildReport(
  allLines: ReportLine[],
  opts: { days: number; to?: Date; costs: Record<string, { unitCost: number; packagingCost: number }>; rules: FeeRules },
): SalesReport {
  const to = opts.to ?? new Date(Math.max(0, ...allLines.map((l) => l.orderDate.getTime())));
  const from = new Date(to.getTime() - opts.days * 86400000);
  const inRange = allLines.filter((l) => l.orderDate > from && l.orderDate <= to);
  const { lines, adjustedOrders } = allocateOrderFees(inRange);
  const notes: string[] = [];
  if (adjustedOrders) notes.push(`${adjustedOrders} pedido(s) com taxas repetidas por item foram rateados para evitar dupla contagem.`);
  const map = new Map<string, SkuRow>();
  const orderSets = new Map<string, Set<string>>();
  for (const l of lines) {
    const r =
      map.get(l.sku) ??
      ({ sku: l.sku, productName: l.productName, orders: 0, units: 0, gross: 0, sellerDiscount: 0, shopeeDiscount: 0, fees: 0, feesEstimated: false, refunds: 0, netRevenue: 0, cost: 0, profit: 0, cancelled: 0, returned: 0, pending: 0 } as SkuRow);
    map.set(l.sku, r);
    if (l.status === "cancelado") { r.cancelled += l.quantity; continue; }
    if (l.status === "pendente") { r.pending += l.quantity; continue; }
    if (l.status === "devolvido") { r.returned += l.quantity; continue; }
    // concluído (pode ter devolução parcial em refundAmount)
    const set = orderSets.get(l.sku) ?? new Set<string>();
    set.add(l.orderId);
    orderSets.set(l.sku, set);
    r.units += l.quantity;
    r.gross += l.grossAmount;
    r.sellerDiscount += l.sellerDiscount;
    r.shopeeDiscount += l.shopeeDiscount;
    r.refunds += l.refundAmount;
    const reported = [l.commissionFee, l.serviceFee, l.transactionFee].filter((v): v is number => v !== null);
    let fee: number;
    if (reported.length) fee = reported.reduce((a, b) => a + b, 0);
    else {
      const perItemPrice = (l.grossAmount - l.sellerDiscount) / l.quantity;
      fee = computeFees(perItemPrice, opts.rules).total * l.quantity;
      r.feesEstimated = true;
    }
    r.fees += fee;
    const c = opts.costs[l.sku];
    if (c && r.cost !== null) r.cost += (c.unitCost + c.packagingCost) * l.quantity;
    else if (!c) r.cost = null;
  }
  const rows = [...map.values()].map((r) => {
    r.orders = orderSets.get(r.sku)?.size ?? 0;
    r.netRevenue = round2(r.gross - r.sellerDiscount - r.fees - r.refunds);
    r.profit = r.cost === null ? null : round2(r.netRevenue - r.cost);
    (["gross", "sellerDiscount", "shopeeDiscount", "fees", "refunds"] as const).forEach((k) => (r[k] = round2(r[k])));
    if (r.cost !== null) r.cost = round2(r.cost);
    return r;
  });
  rows.sort((a, b) => b.units - a.units || b.gross - a.gross);
  const sum = (k: keyof SkuRow) => round2(rows.reduce((s, r) => s + ((r[k] as number) ?? 0), 0));
  const withCost = rows.filter((r) => r.cost !== null && r.units > 0);
  const skusWithoutCost = rows.filter((r) => r.cost === null && r.units > 0).length;
  if (skusWithoutCost) notes.push(`${skusWithoutCost} SKU(s) sem custo cadastrado: lucro não calculado para eles.`);
  if (rows.some((r) => r.feesEstimated)) notes.push("Alguns pedidos não traziam taxas na planilha; foram estimadas pela tabela de comissão vigente (marcadas como estimativa).");
  return {
    from,
    to,
    rows,
    totals: {
      orders: new Set(lines.filter((l) => l.status === "concluido").map((l) => l.orderId)).size,
      units: sum("units"),
      gross: sum("gross"),
      sellerDiscount: sum("sellerDiscount"),
      shopeeDiscount: sum("shopeeDiscount"),
      fees: sum("fees"),
      refunds: sum("refunds"),
      netRevenue: sum("netRevenue"),
      cost: withCost.length ? round2(withCost.reduce((s, r) => s + (r.cost ?? 0), 0)) : null,
      profit: withCost.length ? round2(withCost.reduce((s, r) => s + (r.profit ?? 0), 0)) : null,
      cancelled: sum("cancelled"),
      returned: sum("returned"),
      pending: sum("pending"),
      feesEstimatedAny: rows.some((r) => r.feesEstimated),
      skusWithoutCost,
    },
    notes,
  };
}

export function reportToCsv(rep: SalesReport): string {
  const head = ["SKU", "Produto", "Pedidos", "Unidades", "Bruto", "Desc. vendedor", "Taxas", "Taxas estimadas", "Reembolsos", "Receita líquida", "Custo", "Lucro", "Cancelados", "Devolvidos", "Pendentes"];
  const f = (n: number | null) => (n === null ? "" : n.toFixed(2).replace(".", ","));
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = rep.rows.map((r) =>
    [esc(r.sku), esc(r.productName), r.orders, r.units, f(r.gross), f(r.sellerDiscount), f(r.fees), r.feesEstimated ? "sim" : "não", f(r.refunds), f(r.netRevenue), f(r.cost), f(r.profit), r.cancelled, r.returned, r.pending].join(";"),
  );
  return "﻿" + [head.join(";"), ...lines].join("\r\n");
}
