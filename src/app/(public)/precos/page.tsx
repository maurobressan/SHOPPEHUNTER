import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseLimits, priceLabel, trialDays } from "@/lib/plans";
import { PlanCards } from "@/components/PlanCards";
import { btnPrimary } from "@/components/ui";

export const metadata = { title: "Preços" };

export default async function Precos() {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
  const days = trialDays();
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-center text-3xl font-bold text-ink sm:text-4xl">Planos simples, sem fidelidade</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-mute">{days > 0 ? `Toda conta nova começa com ${days} dias do plano Pro grátis. ` : ""}Depois, escolha o plano ou continue no Grátis.</p>
      <div className="mt-10">
        <PlanCards
          plans={plans.map((p) => ({ id: p.id, name: p.name, description: p.description, price: priceLabel(p.priceCents), limits: parseLimits(p.limits), highlighted: p.highlighted }))}
          action={() => <Link href="/cadastro" className={`${btnPrimary} w-full`}>Criar conta</Link>}
        />
      </div>
    </section>
  );
}
