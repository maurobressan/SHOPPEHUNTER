import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { usage } from "@/lib/usage";
import { billingConfigured } from "@/lib/billing";
import { parseLimits, priceLabel } from "@/lib/plans";
import { startCheckout, openPortal } from "@/app/actions/account";
import { Card, PageHeader, Badge, Notice, btnPrimary, btnGhost } from "@/components/ui";
import { PlanCards } from "@/components/PlanCards";
import { Flash, type SP } from "@/components/Flash";
import { date } from "@/lib/format";

export const metadata = { title: "Assinatura" };

const STATUS: Record<string, [string, "green" | "amber" | "red" | "blue"]> = {
  active: ["ativa", "green"],
  trialing: ["teste grátis", "blue"],
  past_due: ["pagamento pendente", "red"],
  canceled: ["cancelada", "amber"],
};

export default async function Assinatura({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const [plans, u] = await Promise.all([prisma.plan.findMany({ where: { active: true }, orderBy: { sort: "asc" } }), usage(ctx.accountId)]);
  const sub = ctx.subscription;
  const billing = billingConfigured();
  const meter = (label: string, used: number, limit: number) => {
    const pctUsed = limit < 0 ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);
    return (
      <div key={label}>
        <div className="flex justify-between text-xs text-mute"><span>{label}</span><span>{used} / {limit < 0 ? "ilimitado" : limit}</span></div>
        <div className="mt-1 h-2 rounded bg-panel2"><div className={`h-full rounded ${pctUsed >= 100 ? "bg-red-400" : "bg-brand-green"}`} style={{ width: `${limit < 0 ? 5 : pctUsed}%` }} /></div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Assinatura" subtitle="Seu plano, consumo do mês e pagamento." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Plano atual">
          <div className="text-2xl font-semibold text-ink">{ctx.planName}</div>
          {sub && (
            <div className="mt-2 space-y-1 text-sm text-mute">
              <div>Situação: <Badge tone={STATUS[sub.status]?.[1] ?? "amber"}>{STATUS[sub.status]?.[0] ?? sub.status}</Badge></div>
              {sub.status === "trialing" && sub.trialEndsAt && <div>Teste até {date(sub.trialEndsAt)}. Depois disso, a conta volta ao plano Grátis se não houver assinatura.</div>}
              {sub.currentPeriodEnd && <div>{sub.cancelAtPeriodEnd ? "Acesso até" : "Próxima renovação"}: {date(sub.currentPeriodEnd)}</div>}
              {sub.planId !== ctx.planId && <div className="text-amber-300">Assinatura de {sub.planId} sem acesso vigente — usando {ctx.planName}.</div>}
            </div>
          )}
          {sub?.providerCustomerId && billing && ctx.role !== "member" && (
            <form action={openPortal} className="mt-4"><button className={btnGhost}>Gerenciar pagamento, notas e cancelamento</button></form>
          )}
        </Card>
        <Card title="Consumo" className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            {meter("Produtos monitorados", u.products, ctx.limits.products)}
            {meter("Relatórios de análise (mês)", u.aiReports, ctx.limits.aiReports)}
            {meter("Importações de planilha (mês)", u.imports, ctx.limits.imports)}
            {meter("Usuários", u.members, ctx.limits.members)}
          </div>
        </Card>
      </div>
      {!billing && <div className="mt-6"><Notice tone="amber">O pagamento online ainda não está ativo nesta instalação. Para mudar de plano, fale com o suporte.</Notice></div>}
      <div className="mt-6">
        <PlanCards
          plans={plans.map((p) => ({ id: p.id, name: p.name, description: p.description, price: priceLabel(p.priceCents), limits: parseLimits(p.limits), highlighted: p.highlighted }))}
          current={ctx.planId}
          action={(id) =>
            id === ctx.planId ? (
              <Badge tone="green">seu plano</Badge>
            ) : billing && ctx.role !== "member" && plans.find((p) => p.id === id)?.priceCents ? (
              <form action={startCheckout}><input type="hidden" name="planId" value={id} /><button className={`${btnPrimary} w-full`}>Assinar {plans.find((p) => p.id === id)?.name}</button></form>
            ) : null
          }
        />
      </div>
    </>
  );
}
