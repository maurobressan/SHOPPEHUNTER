import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { getActiveFeeSchedule, getSettings } from "@/lib/settings";
import { analyzeById, baseCalcInput } from "@/lib/analysis";
import { PageHeader } from "@/components/ui";
import { Calculator } from "./Calculator";
import { str } from "@/lib/format";
import type { SP } from "@/components/Flash";

export const metadata = { title: "Calculadora Shopee" };

export default async function CalculadoraPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const [settings, cnpj, cpf] = await Promise.all([getSettings(ctx.accountId), getActiveFeeSchedule("CNPJ"), getActiveFeeSchedule("CPF")]);
  let initial = baseCalcInput(settings, 39.9, 12);
  let lot = { units: settings.testLotUnits, unitPrice: 12, freight: 0 };
  let context: { productName: string; competitorPrices: number[]; supplier: string | null; productId: string } | null = null;
  const pid = str(sp.p);
  if (pid) {
    const a = await analyzeById(ctx.accountId, pid, 30);
    if (a) {
      const quoteId = str(sp.q);
      const quote = (quoteId && a.product.quotes.find((q) => q.id === quoteId && q.unitPrice !== null)) || a.chosenQuote;
      const units = quote?.moq ?? settings.testLotUnits;
      const landed = quote?.unitPrice != null ? quote.unitPrice + (quote.shippingCost ?? 0) / Math.max(1, units) : initial.unitCost;
      initial = baseCalcInput(settings, a.salePrice ?? 39.9, Math.round(landed * 100) / 100);
      if (quote?.unitPrice != null) lot = { units, unitPrice: quote.unitPrice, freight: quote.shippingCost ?? 0 };
      context = {
        productId: a.product.id,
        productName: a.product.name,
        supplier: quote ? `${quote.supplier.name} (${quote.unitPrice?.toFixed(2)} + frete rateado)` : null,
        competitorPrices: a.product.listings.map((l) => l.snapshots[l.snapshots.length - 1]?.price).filter((p): p is number => typeof p === "number"),
      };
    }
  }
  const products = await prisma.product.count({ where: { accountId: ctx.accountId } });
  return (
    <>
      <PageHeader
        title="Calculadora Shopee"
        subtitle={`Rentabilidade real com a tabela vigente (${settings.sellerType === "CPF" ? cpf.name : cnpj.name}). Valores por anúncio vendido; altere qualquer campo e os resultados atualizam na hora.`}
      />
      <Calculator
        initial={initial}
        lot={lot}
        payoutDelayDays={settings.payoutDelayDays}
        rules={{ CNPJ: cnpj.rules, CPF: cpf.rules }}
        sources={{ CNPJ: cnpj.sourceUrl, CPF: cpf.sourceUrl }}
        sellerType={settings.sellerType}
        cpfHighVolume={settings.cpfHighVolume}
        taxRegime={settings.taxRegime}
        context={context}
        hasProducts={products > 0}
      />
    </>
  );
}
