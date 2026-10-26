import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { effectivePlanId, parseLimits, priceLabel } from "@/lib/plans";
import { affiliateConfig } from "@/lib/sources/shopee-affiliate";
import { billingConfigured } from "@/lib/billing";
import { emailConfigured } from "@/lib/email";
import { aiConfigured } from "@/lib/ai-report";
import { SHOPEE_BR_2026_10 } from "@/lib/fees";
import { adminSetPlan, adminSavePlan, addFeeSchedule, testAffiliate } from "@/app/actions/account";
import { Card, PageHeader, Stat, Table, td, Badge, Field, input, btnPrimary, btnGhost } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";
import { brl, date, dateTime } from "@/lib/format";

export const metadata = { title: "Administração" };

export default async function Admin({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  await requirePlatformAdmin();
  const [accounts, plans, users, schedules] = await Promise.all([
    prisma.account.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { subscription: true, memberships: { include: { user: { select: { email: true, lastLoginAt: true } } }, where: { role: "owner" } }, _count: { select: { products: true, memberships: true } } },
    }),
    prisma.plan.findMany({ orderBy: { sort: "asc" } }),
    prisma.user.count(),
    prisma.feeSchedule.findMany({ orderBy: [{ sellerType: "asc" }, { validFrom: "desc" }] }),
  ]);
  const price = new Map(plans.map((p) => [p.id, p.priceCents]));
  const paying = accounts.filter((a) => a.subscription?.status === "active" && (price.get(a.subscription.planId) ?? 0) > 0);
  const mrr = paying.reduce((s, a) => s + (price.get(a.subscription!.planId) ?? 0), 0) / 100;
  const trials = accounts.filter((a) => a.subscription?.status === "trialing" && a.subscription.trialEndsAt && a.subscription.trialEndsAt > new Date()).length;
  const status = (ok: boolean, label: string) => <li className="flex justify-between"><span className="text-mute">{label}</span>{ok ? <Badge tone="green">configurado</Badge> : <Badge tone="amber">não configurado</Badge>}</li>;

  return (
    <>
      <PageHeader title="Administração da plataforma" subtitle="Visível só para administradores. Clientes, planos, preços, tabelas de comissão e integrações." />
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Contas" value={accounts.length} />
        <Stat label="Usuários" value={users} />
        <Stat label="Pagantes" value={paying.length} tone="green" />
        <Stat label="Em teste" value={trials} tone="blue" />
        <Stat label="Receita mensal (MRR)" value={brl(mrr)} tone="green" hint="assinaturas ativas × preço do plano" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Integrações do servidor">
          <ul className="space-y-2 text-sm">
            {status(!!affiliateConfig(), "Shopee Afiliados (coleta)")}
            {status(billingConfigured(), "Stripe (pagamentos)")}
            {status(!!process.env.STRIPE_WEBHOOK_SECRET, "Stripe webhook")}
            {status(emailConfigured(), "E-mail (Resend)")}
            {status(aiConfigured(), "IA externa")}
            {status(!!process.env.CRON_SECRET, "Cron da coleta diária")}
          </ul>
          <form action={testAffiliate} className="mt-4"><button className={btnGhost} disabled={!affiliateConfig()}>Testar API de Afiliados</button></form>
          <p className="mt-3 text-xs text-mute">As chaves ficam no arquivo .env do servidor (veja DEPLOY.md). Nunca no código.</p>
        </Card>
        <Card title="Clientes" className="lg:col-span-2">
          <div className="max-h-[520px] overflow-y-auto">
            <Table head={["Conta", "Dono", "Plano efetivo", "Situação", "Produtos", "Criada", "Alterar plano"]}>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td className={td}>{a.name}<div className="text-[11px] text-mute">{a._count.memberships} usuário(s)</div></td>
                  <td className={`${td} text-xs`}>{a.memberships[0]?.user.email}<div className="text-mute">acesso {dateTime(a.memberships[0]?.user.lastLoginAt)}</div></td>
                  <td className={td}>{effectivePlanId(a.subscription)}</td>
                  <td className={`${td} text-xs`}>{a.subscription?.status ?? "—"} {a.subscription?.provider === "stripe" && <Badge tone="blue">stripe</Badge>}<div className="text-mute">{a.subscription?.trialEndsAt ? `teste até ${date(a.subscription.trialEndsAt)}` : a.subscription?.currentPeriodEnd ? `até ${date(a.subscription.currentPeriodEnd)}` : ""}</div></td>
                  <td className={td}>{a._count.products}</td>
                  <td className={td}>{date(a.createdAt)}</td>
                  <td className={td}>
                    <form action={adminSetPlan} className="flex gap-1">
                      <input type="hidden" name="accountId" value={a.id} />
                      <select name="planId" defaultValue={a.subscription?.planId} className={`${input} w-24 py-1 text-xs`}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                      <select name="status" defaultValue="active" className={`${input} w-24 py-1 text-xs`}><option value="active">ativa</option><option value="trialing">teste</option><option value="canceled">cancelada</option></select>
                      <input name="days" placeholder="dias" className={`${input} w-14 py-1 text-xs`} />
                      <button className="text-xs text-brand-blue">ok</button>
                    </form>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      </div>

      <Card title="Planos e preços" className="mt-6">
        <p className="mb-4 text-sm text-mute">Defina aqui o preço de cada plano e o ID de preço criado no Stripe (Produtos → Preço recorrente mensal em BRL). Limites: -1 = ilimitado.</p>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const l = parseLimits(p.limits);
            return (
              <form key={p.id} action={adminSavePlan} className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-panel2/40 p-4">
                <input type="hidden" name="id" value={p.id} />
                <div className="col-span-2 flex items-center justify-between"><b>{p.id}</b><span className="text-sm text-mute">{priceLabel(p.priceCents)}/mês</span></div>
                <Field label="Nome"><input name="name" defaultValue={p.name} className={input} /></Field>
                <Field label="Preço (R$/mês)"><input name="price" defaultValue={(p.priceCents / 100).toFixed(2).replace(".", ",")} className={input} /></Field>
                <div className="col-span-2"><Field label="Descrição"><input name="description" defaultValue={p.description} className={input} /></Field></div>
                <div className="col-span-2"><Field label="Stripe price ID"><input name="stripePriceId" defaultValue={p.stripePriceId ?? ""} placeholder="price_..." className={input} /></Field></div>
                <Field label="Produtos"><input name="products" defaultValue={l.products} className={input} /></Field>
                <Field label="Relatórios/mês"><input name="aiReports" defaultValue={l.aiReports} className={input} /></Field>
                <Field label="Usuários"><input name="members" defaultValue={l.members} className={input} /></Field>
                <Field label="Importações/mês"><input name="imports" defaultValue={l.imports} className={input} /></Field>
                {(["autoCollect", "extension", "alerts", "aiExternal", "active", "highlighted"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-xs text-mute">
                    <input type="checkbox" name={k} defaultChecked={k === "active" ? p.active : k === "highlighted" ? p.highlighted : l[k]} />
                    {{ autoCollect: "Coleta automática", extension: "Extensão", alerts: "Alertas", aiExternal: "IA externa", active: "Plano ativo", highlighted: "Destacar" }[k]}
                  </label>
                ))}
                <div className="col-span-2"><button className={btnPrimary}>Salvar plano</button></div>
              </form>
            );
          })}
        </div>
      </Card>

      <Card title="Tabelas de comissão (valem para todos os clientes)" className="mt-6">
        <Table head={["Nome", "Tipo", "Vigência", "Fonte"]}>
          {schedules.map((f) => (
            <tr key={f.id}>
              <td className={td}>{f.name}</td>
              <td className={td}>{f.sellerType}</td>
              <td className={td}>{date(f.validFrom)} → {f.validTo ? date(f.validTo) : "atual"}</td>
              <td className={td}><a href={f.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-blue">{f.sourceTitle || "fonte"}</a></td>
            </tr>
          ))}
        </Table>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-brand-blue">Cadastrar nova versão (quando a Shopee mudar as taxas)</summary>
          <form action={addFeeSchedule} className="mt-3 grid gap-3 md:grid-cols-4">
            <Field label="Nome"><input name="name" className={input} /></Field>
            <Field label="Tipo"><select name="sellerType" className={input}><option>CNPJ</option><option>CPF</option></select></Field>
            <Field label="Vigente a partir de"><input type="date" name="validFrom" required className={input} /></Field>
            <Field label="Link da fonte oficial"><input name="sourceUrl" required className={input} placeholder="https://seller.shopee.com.br/edu/..." /></Field>
            <div className="md:col-span-2"><Field label="Título da fonte"><input name="sourceTitle" className={input} /></Field></div>
            <div className="md:col-span-2"><Field label="Notas"><input name="notes" className={input} /></Field></div>
            <div className="md:col-span-4"><Field label="Regras (JSON)" hint="pct em fração (0.20 = 20%). lowPrice e cpfSurcharge são opcionais."><textarea name="rules" rows={8} className={`${input} font-mono text-xs`} defaultValue={JSON.stringify(SHOPEE_BR_2026_10, null, 2)} /></Field></div>
            <div><button className={btnPrimary}>Salvar versão</button></div>
          </form>
        </details>
      </Card>
    </>
  );
}
