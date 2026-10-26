import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Sidebar } from "@/components/Sidebar";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const [s, unread, accounts] = await Promise.all([
    getSettings(ctx.accountId),
    prisma.notification.count({ where: { accountId: ctx.accountId, readAt: null } }),
    prisma.membership.findMany({ where: { userId: ctx.user.id }, include: { account: { select: { id: true, name: true } } } }),
  ]);
  const sub = ctx.subscription;
  const trialLeft = sub?.status === "trialing" && sub.trialEndsAt ? Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 86400000) : null;
  const banner = "border-b px-6 py-2 text-center text-[13px] print:hidden";
  return (
    <>
      <Sidebar
        demo={s.demoMode}
        unread={unread}
        user={{ name: ctx.user.name, email: ctx.user.email, isAdmin: ctx.user.isAdmin }}
        account={{ id: ctx.accountId, name: ctx.accountName, plan: ctx.planName }}
        accounts={accounts.map((m) => m.account)}
        trialLeft={trialLeft}
      />
      <main className="lg:pl-64 print:pl-0">
        {s.demoMode && (
          <div className={`${banner} border-warn/25 bg-warn/10 text-ink`}>
            <b className="text-warn">MODO DEMO</b> — itens marcados com DEMO são fictícios e servem apenas para conhecer o sistema.
          </div>
        )}
        {trialLeft !== null && trialLeft > 0 && (
          <div className={`${banner} border-info/20 bg-info/[0.07] text-ink`}>
            Teste grátis do plano {ctx.planName}: <b>{trialLeft} dia(s)</b> restante(s) (até {date(sub!.trialEndsAt)}). <Link href="/assinatura" className="font-semibold text-brand-blue underline-offset-2 hover:underline">Assinar agora</Link>
          </div>
        )}
        {sub?.status === "past_due" && (
          <div className={`${banner} border-bad/25 bg-bad/10 text-bad`}>
            Pagamento pendente. <Link href="/assinatura" className="font-semibold underline">Regularize</Link> para não perder os recursos do plano.
          </div>
        )}
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 print:max-w-none print:p-0">{children}</div>
      </main>
    </>
  );
}
