// Dados obrigatórios (não fictícios): tabelas de comissão oficiais versionadas e planos padrão.
import { PrismaClient } from "@prisma/client";
import { SHOPEE_BR_2026_03, SHOPEE_BR_2026_10 } from "../src/lib/fees";
import { DEFAULT_PLANS } from "../src/lib/plans";

const prisma = new PrismaClient();

async function main() {
  for (const p of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { id: p.id },
      create: { id: p.id, name: p.name, description: p.description, priceCents: p.priceCents, limits: JSON.stringify(p.limits), highlighted: !!p.highlighted, sort: p.sort },
      update: {},
    });
  }
  console.log("Planos verificados.");

  if ((await prisma.feeSchedule.count()) > 0) return console.log("Tabelas de comissão já cadastradas.");
  const official = "https://seller.shopee.com.br/edu/article/26839";
  for (const sellerType of ["CNPJ", "CPF"]) {
    await prisma.feeSchedule.create({
      data: {
        name: `Shopee BR ${sellerType} — mar/2026`,
        sellerType,
        validFrom: new Date("2026-03-01T00:00:00-03:00"),
        validTo: new Date("2026-09-30T23:59:59-03:00"),
        sourceUrl: "https://lider10.com.br/blog/taxas-shopee-2026.html",
        sourceTitle: "Fonte secundária (blog). Versão substituída em 01/10/2026.",
        notes: "Tarifa fixa R$ 4,00 até R$ 79,99; abaixo de R$ 8 a tarifa fixa é metade do preço.",
        rules: JSON.stringify(SHOPEE_BR_2026_03),
      },
    });
    await prisma.feeSchedule.create({
      data: {
        name: `Shopee BR ${sellerType} — out/2026`,
        sellerType,
        validFrom: new Date("2026-10-01T00:00:00-03:00"),
        sourceUrl: official,
        sourceTitle: "Shopee — Confira a Política de Comissão para vendedores CNPJ e CPF (atualizado em 01/10/2026)",
        notes:
          "20% + R$ 4,50 até R$ 79,99; 14% + R$ 16 (R$ 80–99,99); 14% + R$ 20 (R$ 100–199,99); 14% + R$ 26 (a partir de R$ 200). Comissão inclui taxa de transação. Sem comissão em cancelamento/devolução. Abaixo de R$ 9 a tarifa fixa é metade do preço." +
          (sellerType === "CPF" ? " CPF com mais de 450 pedidos em 90 dias: + R$ 3 por item (estrutura regressiva abaixo de R$ 12 não detalhada)." : ""),
        rules: JSON.stringify(SHOPEE_BR_2026_10),
      },
    });
  }
  console.log("Tabelas de comissão cadastradas.");
}

main().finally(() => prisma.$disconnect());
