// Utilidades da integração com a extensão "Salvar no Hunter".
import { z } from "zod";

// URLs de anúncio da Shopee: .../nome-do-produto-i.{shopId}.{itemId} ou /product/{shopId}/{itemId}
export function parseShopeeUrl(url: string): { shopId: string; itemId: string } | null {
  let m = url.match(/-i\.(\d+)\.(\d+)/);
  if (m) return { shopId: m[1], itemId: m[2] };
  m = url.match(/\/product\/(\d+)\/(\d+)/);
  if (m) return { shopId: m[1], itemId: m[2] };
  return null;
}

export function isShopeeUrl(url: string) {
  try {
    const h = new URL(url).hostname;
    return h === "shopee.com.br" || h.endsWith(".shopee.com.br");
  } catch {
    return false;
  }
}

export const captureSchema = z.object({
  url: z.string().url().refine(isShopeeUrl, "Somente anúncios de shopee.com.br"),
  title: z.string().min(2).max(400),
  shopName: z.string().max(200).default(""),
  imageUrl: z.string().max(1000).default(""),
  price: z.number().positive().max(1e6).nullable(),
  priceMax: z.number().positive().max(1e6).nullable().default(null),
  sold: z.number().int().min(0).max(1e9).nullable(),
  // a Shopee arredonda números grandes ("1,2mil vendidos"); nesse caso o registro tem confiabilidade baixa
  soldApprox: z.boolean().default(false),
  ratingStar: z.number().min(0).max(5).nullable(),
  ratingCount: z.number().int().min(0).max(1e9).nullable(),
  productId: z.string().optional(),
  newProductName: z.string().max(200).optional(),
});

export type CapturePayload = z.infer<typeof captureSchema>;
