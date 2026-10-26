// Cliente da Shopee Affiliate Open API (GraphQL), fonte OFICIAL e autorizada.
// Requer conta aprovada no Programa de Afiliados Shopee BR (gratuito) e AppID/Secret no .env.
// Assinatura: SHA256(AppId + Timestamp + Payload + Secret).
import { createHash } from "node:crypto";

export interface AffiliateOffer {
  itemId: string;
  shopId: string;
  shopName: string;
  productName: string;
  price: number | null;
  priceMin: number | null;
  priceMax: number | null;
  sales: number | null; // vendas acumuladas informadas pela Shopee (não é "últimos 30 dias")
  ratingStar: number | null;
  imageUrl: string;
  productLink: string;
  offerLink: string;
  productCatIds: number[];
  raw: unknown;
}

export interface AffiliateConfig {
  appId: string;
  secret: string;
  endpoint: string;
}

export function affiliateConfig(): AffiliateConfig | null {
  const appId = process.env.SHOPEE_AFFILIATE_APP_ID?.trim();
  const secret = process.env.SHOPEE_AFFILIATE_SECRET?.trim();
  if (!appId || !secret) return null;
  return { appId, secret, endpoint: process.env.SHOPEE_AFFILIATE_ENDPOINT?.trim() || "https://open-api.affiliate.shopee.com.br/graphql" };
}

export function signRequest(cfg: AffiliateConfig, payload: string, timestamp: number): string {
  const sig = createHash("sha256").update(cfg.appId + timestamp + payload + cfg.secret).digest("hex");
  return `SHA256 Credential=${cfg.appId}, Timestamp=${timestamp}, Signature=${sig}`;
}

// sortType: 1 relevância, 2 mais vendidos, 3 maior preço, 4 menor preço, 5 maior comissão
export interface SearchParams {
  keyword?: string;
  productCatId?: number;
  sortType?: 1 | 2 | 3 | 4 | 5;
  page?: number;
  limit?: number;
}

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export async function searchOffers(cfg: AffiliateConfig, p: SearchParams): Promise<{ offers: AffiliateOffer[]; hasNextPage: boolean }> {
  const args: string[] = [];
  if (p.keyword) args.push(`keyword: ${JSON.stringify(p.keyword)}`);
  if (p.productCatId) args.push(`productCatId: ${p.productCatId}`);
  args.push(`sortType: ${p.sortType ?? 2}`, `page: ${p.page ?? 1}`, `limit: ${Math.min(50, p.limit ?? 50)}`);
  const query = `{ productOfferV2(${args.join(", ")}) { nodes { itemId shopId shopName productName price priceMin priceMax sales ratingStar imageUrl productLink offerLink productCatIds } pageInfo { page limit hasNextPage } } }`;
  const payload = JSON.stringify({ query });
  const ts = Math.floor(Date.now() / 1000);
  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: signRequest(cfg, payload, ts) },
    body: payload,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopee Afiliados respondeu HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { productOfferV2?: { nodes: Record<string, unknown>[]; pageInfo?: { hasNextPage?: boolean } } }; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Shopee Afiliados: ${json.errors.map((e) => e.message).join("; ")}`);
  const conn = json.data?.productOfferV2;
  if (!conn) throw new Error("Resposta inesperada da API de Afiliados (sem productOfferV2).");
  return {
    hasNextPage: !!conn.pageInfo?.hasNextPage,
    offers: conn.nodes.map((n) => ({
      itemId: String(n.itemId),
      shopId: String(n.shopId ?? ""),
      shopName: String(n.shopName ?? ""),
      productName: String(n.productName ?? ""),
      price: num(n.price),
      priceMin: num(n.priceMin),
      priceMax: num(n.priceMax),
      sales: num(n.sales),
      ratingStar: num(n.ratingStar),
      imageUrl: String(n.imageUrl ?? ""),
      productLink: String(n.productLink ?? ""),
      offerLink: String(n.offerLink ?? ""),
      productCatIds: Array.isArray(n.productCatIds) ? (n.productCatIds as unknown[]).map(Number) : [],
      raw: n,
    })),
  };
}
