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
  return (
    <>
      <Sidebar
        demo={s.demoMode}
        unread={unread}
        user={{ name: ctx.user.name, email: ctx.user.email, isAdmin: ctx.user.isAdmin }}
        account={{ id: ctx.accountId, name: ctx.accountName, plan: ctx.planName }}
        accounts={accounts.map((m) => m.account)}
      />
      <main className="lg:pl-64 print:pl-0">
        {s.demoMode && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-center text-xs text-amber-200 print:hidden">
            MODO DEMO — itens marcados com [DEMO] são fictícios e servem apenas para conhecer o sistema.
          </div>
        )}
        {trialLeft !== null && trialLeft > 0 && (
          <div className="border-b border-brand-blue/30 bg-brand-blue/10 px-6 py-2 text-center text-xs text-blue-200 print:hidden">
            Teste grátis do plano {ctx.planName}: {trialLeft} dia(s) restante(s) (até {date(sub!.trialEndsAt)}). <Link href="/assinatura" className="underline">Assinar</Link>
          </div>
        )}
        {sub?.status === "past_due" && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-2 text-center text-xs text-red-200 print:hidden">
            Pagamento pendente. <Link href="/assinatura" className="underline">Regularize</Link> para não perder os recursos do plano.
          </div>
        )}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">{children}</div>
      </main>
    </>
  );
}
