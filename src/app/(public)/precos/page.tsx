import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseLimits, priceLabel, trialDays } from "@/lib/plans";
import { PlanCards } from "@/components/PlanCards";
import { btnPrimary, btnGhost } from "@/components/ui";

export const metadata = { title: "Preços" };

export default async function Precos() {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
  const days = trialDays();
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_360px_at_50%_0%,rgba(24,200,232,0.14),transparent_65%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center text-sm font-bold uppercase tracking-[0.12em] text-brand-blue">Preços</div>
        <h1 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">Planos simples, sem fidelidade</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-mute">{days > 0 ? `Toda conta nova começa com ${days} dias do plano Pro grátis. ` : ""}Depois, escolha o plano ou continue no Grátis.</p>
        <div className="mt-14">
          <PlanCards
            plans={plans.map((p) => ({ id: p.id, name: p.name, description: p.description, price: priceLabel(p.priceCents), limits: parseLimits(p.limits), highlighted: p.highlighted }))}
            action={(id) => <Link href="/cadastro" className={`${plans.find((p) => p.id === id)?.highlighted ? btnPrimary : btnGhost} w-full py-2.5`}>Criar conta</Link>}
          />
        </div>
      </div>
    </section>
  );
}
