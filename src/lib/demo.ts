// MODO DEMO: dados FICTÍCIOS, sempre marcados com isDemo = true e prefixo [DEMO].
import type { PrismaClient } from "@prisma/client";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

type Pattern = (dayAgo: number) => number; // multiplicador do ritmo diário

const P: Record<string, Pattern> = {
  explosivo: (d) => (d < 10 ? 3.2 - d * 0.18 : 1),
  crescimento: (d) => 1 + (90 - d) / 60,
  estavel: () => 1,
  queda: (d) => 0.35 + d / 90,
  saturado: () => 1,
};

const PRODUCTS = [
  { name: "Mini processador elétrico USB", cat: "Casa e Cozinha", price: 49.9, rate: 25, pattern: "explosivo", listings: 6, cost: 16.5 },
  { name: "Garrafa térmica inox 500 ml", cat: "Casa e Cozinha", price: 39.9, rate: 40, pattern: "crescimento", listings: 8, cost: 12 },
  { name: "Organizador de gaveta modular (kit 6)", cat: "Casa e Organização", price: 34.9, rate: 18, pattern: "crescimento", listings: 5, cost: 9.8 },
  { name: "Luminária LED de mesa recarregável", cat: "Iluminação", price: 69.9, rate: 12, pattern: "estavel", listings: 6, cost: 24 },
  { name: "Capa de celular silicone (genérica)", cat: "Acessórios para Celular", price: 19.9, rate: 90, pattern: "saturado", listings: 60, cost: 3.5 },
  { name: "Fone Bluetooth TWS básico", cat: "Áudio", price: 59.9, rate: 50, pattern: "queda", listings: 12, cost: 28 },
  { name: "Escova secadora 3 em 1", cat: "Beleza", price: 119.9, rate: 15, pattern: "crescimento", listings: 7, cost: 52 },
  { name: "Tapete higiênico pet lavável", cat: "Pet Shop", price: 44.9, rate: 10, pattern: "explosivo", listings: 4, cost: 13 },
  { name: "Suporte de notebook ajustável", cat: "Informática", price: 89.9, rate: 9, pattern: "estavel", listings: 5, cost: 31 },
  { name: "Kit pincéis de maquiagem 12 peças", cat: "Beleza", price: 29.9, rate: 30, pattern: "queda", listings: 10, cost: 8.9 },
];

export async function seedDemo(prisma: PrismaClient, accountId: string) {
  await clearDemo(prisma, accountId);
  const rand = rng(42);
  const now = new Date();
  const days = 90;
  for (const [pi, d] of PRODUCTS.entries()) {
    const product = await prisma.product.create({
      data: { accountId, name: `[DEMO] ${d.name}`, category: d.cat, keywords: d.name.toLowerCase(), isDemo: true, notes: "Produto fictício do modo demonstração." },
    });
    for (let li = 0; li < d.listings; li++) {
      const lp = d.price * (0.75 + rand() * 0.55);
      const share = li === 0 ? 0.35 : (0.65 / d.listings) * (0.5 + rand());
      const startAgo = li < d.listings - 2 || d.pattern !== "explosivo" ? days : Math.floor(rand() * 20);
      const listing = await prisma.listing.create({
        data: {
          accountId,
          title: `[DEMO] ${d.name} ${["Premium", "Original", "Kit", "Pronta Entrega", "Promoção", "Novo"][li % 6]}`,
          shopName: `Loja Demo ${pi + 1}-${li + 1}`,
          shopId: `demo-${pi}-${li}`,
          externalItemId: `demo-item-${pi}-${li}`,
          url: "",
          isDemo: true,
          productId: product.id,
          weakPhotos: rand() < 0.2,
          firstSeenAt: new Date(now.getTime() - startAgo * 86400000),
        },
      });
      let cum = Math.round(rand() * 3000 * share * 10);
      let price = lp;
      const snaps = [];
      for (let ago = startAgo; ago >= 0; ago -= 1) {
        const rate = d.rate * share * P[d.pattern](ago) * (0.7 + rand() * 0.6);
        cum += Math.max(0, Math.round(rate));
        if (d.pattern === "saturado") price = lp * (1 - (days - ago) * 0.003);
        else price = lp * (0.97 + rand() * 0.06);
        const t = new Date(now.getTime() - ago * 86400000);
        snaps.push({
          listingId: listing.id,
          source: "demo",
          collectedAt: t,
          referenceDate: t,
          price: Math.round(price * 100) / 100,
          salesCumulative: cum,
          ratingStar: Math.round((4 + rand()) * 10) / 10,
          ratingCount: Math.round(cum * 0.3),
          reliability: "baixa",
        });
      }
      await prisma.snapshot.createMany({ data: snaps });
    }
    const sBR = await prisma.supplier.create({ data: { accountId, name: `[DEMO] Atacadista Fictício ${pi + 1}`, kind: "atacadista", country: "Brasil", location: "São Paulo/SP", isDemo: true } });
    await prisma.supplierQuote.create({ data: { supplierId: sBR.id, productId: product.id, unitPrice: d.cost, moq: 50, shippingCost: 60, leadTimeDays: 5, channel: "whatsapp", isDemo: true, notes: "Cotação fictícia." } });
    if (pi % 3 === 0) {
      const sInt = await prisma.supplier.create({ data: { accountId, name: `[DEMO] Fábrica Exterior ${pi + 1}`, kind: "internacional", country: "China", isDemo: true } });
      await prisma.supplierQuote.create({ data: { supplierId: sInt.id, productId: product.id, unitPrice: Math.round(d.cost * 0.6 * 100) / 100, moq: 300, shippingCost: 900, leadTimeDays: 45, channel: "site", isDemo: true } });
    }
  }
}

export async function clearDemo(prisma: PrismaClient, accountId: string) {
  await prisma.product.deleteMany({ where: { accountId, isDemo: true } });
  await prisma.listing.deleteMany({ where: { accountId, isDemo: true } });
  await prisma.supplier.deleteMany({ where: { accountId, isDemo: true } });
}
