import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { autoMap, parseMoney, parseDate, parseOrders, normalizeStatus } from "@/lib/import/orders";
import { buildReport, reportToCsv } from "@/lib/import/report";
import { readCsv, readSheet } from "@/lib/import/read-file";
import { SHOPEE_BR_2026_10 as R } from "@/lib/fees";

const CSV = `ID do pedido;Status do pedido;Data de criação do pedido;Número de referência SKU;Nome do Produto;Nome da variação;Preço acordado;Quantidade;Subtotal do produto;Cupom do vendedor;Cupom Shopee;Taxa de comissão;Taxa de serviço
A1;Concluído;2026-10-20 10:00;SKU-1;Garrafa Térmica;Preta;R$ 39,90;2;79,80;5,00;3,00;15,96;9,00
A1;Concluído;2026-10-20 10:00;SKU-1;Garrafa Térmica;Preta;R$ 39,90;2;79,80;5,00;3,00;15,96;9,00
A2;Cancelado;2026-10-21 11:00;SKU-1;Garrafa Térmica;Preta;39,90;1;39,90;;;;
A3;A Enviar;2026-10-22 12:00;SKU-2;Copo;Azul;19,90;1;19,90;;;;
A4;Concluído;21/10/2026 09:30;SKU-2;Copo;Azul;19,90;3;59,70;;;;
A5;Concluído;2026-10-23 09:00;SKU-1;Garrafa Térmica;Preta;39,90;1;39,90;;;7,98;4,50
A5;Concluído;2026-10-23 09:00;SKU-2;Copo;Azul;19,90;1;19,90;;;7,98;4,50
X9;Concluído;data ruim;SKU-2;Copo;Azul;19,90;1;19,90;;;;
X10;Concluído;2026-10-23 09:00;SKU-2;Copo;Azul;19,90;0;0;;;;
`;

describe("utilitários", () => {
  it("números em formato brasileiro", () => {
    expect(parseMoney("R$ 1.234,56")).toBe(1234.56);
    expect(parseMoney("39,90")).toBe(39.9);
    expect(parseMoney("1234.5")).toBe(1234.5);
    expect(parseMoney("1.234")).toBe(1234);
    expect(parseMoney("-5,00")).toBe(-5);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });
  it("datas", () => {
    expect(parseDate("2026-10-01 14:33")?.getDate()).toBe(1);
    expect(parseDate("05/10/2026")?.getMonth()).toBe(9);
    expect(parseDate("ontem")).toBeNull();
  });
  it("status", () => {
    expect(normalizeStatus("Concluído")).toBe("concluido");
    expect(normalizeStatus("Cancelado")).toBe("cancelado");
    expect(normalizeStatus("A Enviar")).toBe("pendente");
    expect(normalizeStatus("Devolução/Reembolso")).toBe("devolvido");
    expect(normalizeStatus("Concluído", "Reembolso aprovado")).toBe("devolvido");
  });
});

describe("importação de pedidos", () => {
  const sheet = readCsv(CSV);
  const map = autoMap(sheet.headers);

  it("detecta colunas automaticamente", () => {
    expect(map.orderId).toBe("ID do pedido");
    expect(map.sku).toBe("Número de referência SKU");
    expect(map.unitPrice).toBe("Preço acordado");
    expect(map.sellerCoupon).toBe("Cupom do vendedor");
    expect(map.shopeeCoupon).toBe("Cupom Shopee");
    expect(map.commissionFee).toBe("Taxa de comissão");
  });

  it("valida, remove duplicadas e rejeita linhas inválidas", () => {
    const r = parseOrders(sheet.rows, map);
    expect(r.missingRequired).toEqual([]);
    expect(r.duplicatesInFile).toBe(1);
    expect(r.errors.map((e) => e.row)).toEqual([9, 10]);
    expect(r.lines).toHaveLength(6);
  });

  it("aponta colunas obrigatórias ausentes", () => {
    expect(parseOrders(sheet.rows, { orderId: "ID do pedido" }).missingRequired).toContain("quantity");
  });

  it("relatório trata cancelados, pendentes, taxas repetidas e custos", () => {
    const { lines } = parseOrders(sheet.rows, map);
    const rep = buildReport(lines, { days: 30, costs: { "SKU-1": { unitCost: 12, packagingCost: 1.2 } }, rules: R });
    const s1 = rep.rows.find((r) => r.sku === "SKU-1")!;
    expect(s1.units).toBe(3);
    expect(s1.cancelled).toBe(1);
    expect(s1.sellerDiscount).toBe(5);
    // A1: 24,96 ; A5 (taxas repetidas 12,48 rateadas 2/3): 8,32
    expect(s1.fees).toBe(33.28);
    expect(s1.cost).toBe(39.6);
    expect(s1.profit).toBe(Math.round((119.7 - 5 - 33.28 - 39.6) * 100) / 100);
    const s2 = rep.rows.find((r) => r.sku === "SKU-2")!;
    expect(s2.pending).toBe(1);
    expect(s2.units).toBe(4);
    expect(s2.feesEstimated).toBe(true); // A4 sem taxas na planilha
    expect(s2.profit).toBeNull();
    expect(rep.notes.join(" ")).toMatch(/rateados/);
    expect(rep.totals.orders).toBe(3);
    expect(reportToCsv(rep)).toContain("SKU-1");
  });

  it("filtra o período (7 dias)", () => {
    const { lines } = parseOrders(sheet.rows, map);
    const rep = buildReport(lines, { days: 1, costs: {}, rules: R });
    expect(rep.rows.reduce((s, r) => s + r.units, 0)).toBe(2); // só A5
  });

  it("lê XLSX", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("orders");
    ws.addRow(["ID do pedido", "Status do pedido", "Data de criação do pedido", "Nome do Produto", "Preço acordado", "Quantidade"]);
    ws.addRow(["B1", "Concluído", new Date(2026, 9, 10), "Item", 25.5, 2]);
    const buf = await wb.xlsx.writeBuffer();
    const sheet = await readSheet("pedidos.xlsx", buf as ArrayBuffer);
    const r = parseOrders(sheet.rows, autoMap(sheet.headers));
    expect(r.errors).toEqual([]);
    expect(r.lines[0].grossAmount).toBe(51);
    expect(r.lines[0].sku).toBe("Item");
  });
});
