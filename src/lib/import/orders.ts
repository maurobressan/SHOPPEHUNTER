// Importação de planilhas de pedidos exportadas do Centro do Vendedor (Minhas Vendas → Exportar).
// Funções puras: recebem linhas já lidas (CSV/XLSX) e devolvem pedidos normalizados + erros.

export type FieldKey =
  | "orderId" | "status" | "returnStatus" | "orderDate" | "sku" | "parentSku" | "productName" | "variation"
  | "unitPrice" | "originalPrice" | "quantity" | "returnedQty" | "subtotal" | "sellerDiscount" | "sellerCoupon"
  | "shopeeDiscount" | "shopeeCoupon" | "commissionFee" | "serviceFee" | "transactionFee";

export const FIELDS: { key: FieldKey; label: string; required?: boolean; synonyms: string[] }[] = [
  { key: "orderId", label: "ID do pedido", required: true, synonyms: ["id do pedido", "numero do pedido", "order id", "order sn", "pedido"] },
  { key: "status", label: "Status do pedido", required: true, synonyms: ["status do pedido", "order status", "status"] },
  { key: "returnStatus", label: "Status de devolução/reembolso", synonyms: ["status da devolucao", "devolucao reembolso", "return refund status"] },
  { key: "orderDate", label: "Data do pedido", required: true, synonyms: ["data de criacao do pedido", "data do pedido", "order creation date", "data de criacao", "data"] },
  { key: "sku", label: "SKU", synonyms: ["numero de referencia sku", "sku da variacao", "variation sku", "sku"] },
  { key: "parentSku", label: "SKU principal", synonyms: ["sku principal", "referencia do sku principal", "parent sku"] },
  { key: "productName", label: "Nome do produto", required: true, synonyms: ["nome do produto", "product name", "produto"] },
  { key: "variation", label: "Variação", synonyms: ["nome da variacao", "variation name", "variacao"] },
  { key: "unitPrice", label: "Preço acordado (unitário)", required: true, synonyms: ["preco acordado", "deal price", "preco de venda", "preco unitario", "preco"] },
  { key: "originalPrice", label: "Preço original", synonyms: ["preco original", "original price"] },
  { key: "quantity", label: "Quantidade", required: true, synonyms: ["quantidade", "quantity", "qtd"] },
  { key: "returnedQty", label: "Quantidade devolvida", synonyms: ["returned quantity", "quantidade devolvida"] },
  { key: "subtotal", label: "Subtotal do produto", synonyms: ["subtotal do produto", "product subtotal", "subtotal"] },
  { key: "sellerDiscount", label: "Desconto do vendedor", synonyms: ["desconto do vendedor", "seller discount"] },
  { key: "sellerCoupon", label: "Cupom do vendedor", synonyms: ["cupom do vendedor", "seller voucher", "cupom da loja"] },
  { key: "shopeeDiscount", label: "Desconto Shopee", synonyms: ["desconto da shopee", "desconto shopee", "shopee rebate", "reembolso shopee"] },
  { key: "shopeeCoupon", label: "Cupom Shopee", synonyms: ["cupom shopee", "shopee voucher"] },
  { key: "commissionFee", label: "Taxa de comissão", synonyms: ["taxa de comissao", "commission fee", "comissao"] },
  { key: "serviceFee", label: "Taxa de serviço", synonyms: ["taxa de servico", "service fee"] },
  { key: "transactionFee", label: "Taxa de transação", synonyms: ["taxa de transacao", "transaction fee"] },
];

export type Mapping = Partial<Record<FieldKey, string>>;

export const norm = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Detecta colunas: primeiro correspondência exata, depois "contém". Cada coluna só é usada uma vez.
export function autoMap(headers: string[]): Mapping {
  const map: Mapping = {};
  const used = new Set<string>();
  const nh = headers.map((h) => ({ h, n: norm(h) }));
  for (const pass of ["exact", "contains"] as const) {
    for (const f of FIELDS) {
      if (map[f.key]) continue;
      for (const syn of f.synonyms) {
        const hit = nh.find(({ h, n }) => !used.has(h) && (pass === "exact" ? n === syn : n.includes(syn)));
        if (hit) {
          map[f.key] = hit.h;
          used.add(hit.h);
          break;
        }
      }
    }
  }
  return map;
}

export function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/R\$|\s/g, "").trim();
  if (!s || s === "-") return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\-]/g, "");
  const lc = s.lastIndexOf(",");
  const ld = s.lastIndexOf(".");
  if (lc >= 0 && ld >= 0) s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (lc >= 0) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    // número serial do Excel
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  return null;
}

export type OrderStatus = "concluido" | "pendente" | "cancelado" | "devolvido";

export function normalizeStatus(status: string, returnStatus = ""): OrderStatus {
  const s = norm(status);
  const r = norm(returnStatus);
  if (s.includes("cancel")) return "cancelado";
  if (s.includes("devol") || s.includes("reembols") || s.includes("return") || s.includes("refund")) return "devolvido";
  if (r && /(aprovad|conclu|aceit|reembolsad|approved|completed)/.test(r)) return "devolvido";
  if (s.includes("conclu") || s.includes("complet") || s.includes("entregue") || s.includes("delivered")) return "concluido";
  return "pendente";
}

export interface ParsedLine {
  dedupeKey: string;
  orderId: string;
  orderDate: Date;
  status: OrderStatus;
  rawStatus: string;
  sku: string;
  productName: string;
  variation: string;
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

export interface ParseResult {
  lines: ParsedLine[];
  duplicatesInFile: number;
  errors: { row: number; message: string }[];
  missingRequired: FieldKey[];
}

export function parseOrders(rows: Record<string, unknown>[], mapping: Mapping): ParseResult {
  const missingRequired = FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.key);
  const out: ParseResult = { lines: [], duplicatesInFile: 0, errors: [], missingRequired };
  if (missingRequired.length) return out;
  const get = (r: Record<string, unknown>, k: FieldKey) => (mapping[k] ? r[mapping[k]!] : undefined);
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const rowNo = i + 2; // linha 1 = cabeçalho
    const orderId = String(get(r, "orderId") ?? "").trim();
    if (!orderId) {
      if (Object.values(r).every((v) => v === null || v === undefined || String(v).trim() === "")) return; // linha vazia
      out.errors.push({ row: rowNo, message: "ID do pedido vazio" });
      return;
    }
    const date = parseDate(get(r, "orderDate"));
    if (!date) return void out.errors.push({ row: rowNo, message: `Data inválida: "${get(r, "orderDate")}"` });
    const qty = parseMoney(get(r, "quantity"));
    if (qty === null || qty <= 0 || !Number.isInteger(qty)) return void out.errors.push({ row: rowNo, message: `Quantidade inválida: "${get(r, "quantity")}"` });
    const unit = parseMoney(get(r, "unitPrice"));
    if (unit === null || unit < 0) return void out.errors.push({ row: rowNo, message: `Preço inválido: "${get(r, "unitPrice")}"` });
    const productName = String(get(r, "productName") ?? "").trim();
    const variation = String(get(r, "variation") ?? "").trim();
    const sku = String(get(r, "sku") ?? "").trim() || String(get(r, "parentSku") ?? "").trim() || `${productName}${variation ? " | " + variation : ""}`;
    const rawStatus = String(get(r, "status") ?? "").trim();
    let status = normalizeStatus(rawStatus, String(get(r, "returnStatus") ?? ""));
    const returnedQty = parseMoney(get(r, "returnedQty")) ?? 0;
    const subtotal = parseMoney(get(r, "subtotal"));
    const gross = subtotal ?? unit * qty;
    let refund = 0;
    if (returnedQty > 0) {
      refund = Math.min(gross, unit * returnedQty);
      if (returnedQty >= qty) status = "devolvido";
    }
    const key = [orderId, sku, variation, unit.toFixed(2), qty].join("|");
    if (seen.has(key)) {
      out.duplicatesInFile++;
      return;
    }
    seen.add(key);
    out.lines.push({
      dedupeKey: key,
      orderId,
      orderDate: date,
      status,
      rawStatus,
      sku,
      productName,
      variation,
      quantity: qty,
      unitPrice: unit,
      grossAmount: gross,
      sellerDiscount: Math.abs(parseMoney(get(r, "sellerDiscount")) ?? 0) + Math.abs(parseMoney(get(r, "sellerCoupon")) ?? 0),
      shopeeDiscount: Math.abs(parseMoney(get(r, "shopeeDiscount")) ?? 0) + Math.abs(parseMoney(get(r, "shopeeCoupon")) ?? 0),
      commissionFee: abs(parseMoney(get(r, "commissionFee"))),
      serviceFee: abs(parseMoney(get(r, "serviceFee"))),
      transactionFee: abs(parseMoney(get(r, "transactionFee"))),
      refundAmount: refund,
    });
  });
  return out;
}

const abs = (n: number | null) => (n === null ? null : Math.abs(n));
