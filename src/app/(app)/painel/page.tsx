import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { analyzeAll } from "@/lib/analysis";
import { scope, getActiveFeeSchedule, getSettings } from "@/lib/settings";
import { affiliateConfig } from "@/lib/sources/shopee-affiliate";
import { usage } from "@/lib/usage";
import { dismissOnboarding } from "@/app/actions/app";
import { Card, PageHeader, Stat, Badge, TrendBadge, RecBadge, Empty, Table, td, DemoTag, btnPrimary, btnGhost } from "@/components/ui";
import { brl, dateTime, pct, signedPct } from "@/lib/format";
import { TREND_LABELS, type TrendClass } from "@/lib/trends";
import { Flash, type SP } from "@/components/Flash";
import { CheckCircle2, Circle } from "lucide-react";

export default async function Painel({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const where = await scope(ctx.accountId);
  const settings = await getSettings(ctx.accountId);
  const [analyses, listings, snapshots, lastRun, fee, orders, quotes, tokens, alerts, u] = await Promise.all([
    analyzeAll(ctx.accountId, 30),
    prisma.listing.count({ where }),
    prisma.snapshot.count({ where: { listing: where } }),
    prisma.collectionRun.findFirst({ where: { accountId: ctx.accountId }, orderBy: { startedAt: "desc" } }),
    getActiveFeeSchedule(settings.sellerType),
    prisma.orderLine.count({ where: { accountId: ctx.accountId } }),
    prisma.supplierQuote.count({ where: { product: { accountId: ctx.accountId, isDemo: false } } }),
    prisma.apiToken.count({ where: { accountId: ctx.accountId } }),
    prisma.notification.findMany({ where: { accountId: ctx.accountId, readAt: null }, orderBy: { createdAt: "desc" }, take: 4 }),
    usage(ctx.accountId),
  ]);
  const ranked = analyses.filter((a) => a.score.score !== null).sort((a, b) => Number(b.score.confirmed) - Number(a.score.confirmed) || (b.score.score ?? 0) - (a.score.score ?? 0));
  const counts = analyses.reduce<Record<string, number>>((m, a) => ((m[a.trend.classification] = (m[a.trend.classification] ?? 0) + 1), m), {});
  const buy = analyses.filter((a) => a.score.recommendation === "Comprar para testar" && a.score.confirmed).length;
  const steps = [
    { done: settings.taxRegime !== "nao_configurado", label: "Configurar regime tributário e custos padrão", href: "/configuracoes" },
    { done: u.products > 0, label: "Cadastrar o primeiro produto para analisar", href: "/meus-produtos" },
    { done: quotes > 0, label: "Registrar uma cotação de fornecedor", href: "/fornecedores" },
    { done: tokens > 0, label: "Instalar a extensão “Salvar no Hunter”", href: "/conta#extensao" },
    { done: orders > 0, label: "Importar a planilha de vendas da sua loja", href: "/vendas" },
  ];
  const showOnboarding = !settings.onboardingDismissed && steps.some((x) => !x.done);

  return (
    <>
      <PageHeader title={`Olá, ${ctx.user.name.split(" ")[0]}`} subtitle="Resumo das oportunidades, produtos monitorados e tendências (últimos 30 dias).">
        <Link href="/meus-produtos" className={btnPrimary}>+ Analisar produto</Link>
      </PageHeader>
      <Flash sp={sp} />

      {showOnboarding && (
        <Card title="Primeiros passos" className="mb-6" actions={<form action={dismissOnboarding}><button className="text-xs text-mute hover:text-ink">ocultar</button></form>}>
          <div className="grid gap-2 md:grid-cols-2">
            {steps.map((x) => (
              <Link key={x.label} href={x.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-panel2">
                {x.done ? <CheckCircle2 size={17} className="text-brand-green" /> : <Circle size={17} className="text-mute" />}
                <span className={x.done ? "text-mute line-through" : "text-ink"}>{x.label}</span>
              </Link>
            ))}
          </div>
          {!settings.demoMode && <p className="mt-3 text-xs text-mute">Quer ver tudo funcionando antes? Ative o Modo DEMO em <Link className="text-brand-blue" href="/configuracoes">Configurações</Link>.</p>}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Produtos monitorados" value={analyses.length} hint={`${listings} anúncios · ${snapshots} snapshots`} />
        <Stat label="Comprar para testar" value={buy} tone="green" hint="oportunidades com dados confirmados" />
        <Stat label="Em crescimento / explosivos" value={(counts.crescimento ?? 0) + (counts.explosivo ?? 0)} tone="blue" />
        <Stat label="Última coleta automática" value={<span className="text-base">{lastRun ? dateTime(lastRun.startedAt) : "nunca"}</span>} hint={!affiliateConfig() ? "API não configurada no servidor" : ctx.limits.autoCollect ? "incluída no seu plano" : "disponível nos planos pagos"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Top oportunidades (Hunter Score)" className="lg:col-span-2" actions={<Link href="/campeoes" className="text-xs text-brand-blue">ver ranking →</Link>}>
          {ranked.length === 0 ? (
            <Empty title="Nenhum produto analisado ainda">
              Cadastre produtos em <Link className="text-brand-blue" href="/meus-produtos">Meus Produtos</Link> ou capture anúncios pela extensão enquanto navega na Shopee.
            </Empty>
          ) : (
            <Table head={["Produto", "Score", "Tendência", "Vendas 30d", "Margem", "Recomendação"]}>
              {ranked.slice(0, 8).map((a) => (
                <tr key={a.product.id} className="hover:bg-panel2/50">
                  <td className={td}>
                    <Link href={`/produtos/${a.product.id}`} className="font-medium hover:text-brand-blue">{a.product.name}</Link> <DemoTag show={a.product.isDemo} />
                  </td>
                  <td className={`${td} font-semibold ${a.score.confirmed ? "text-brand-green" : "text-amber-300"}`}>{a.score.score!.toFixed(0)}{!a.score.confirmed && "*"}</td>
                  <td className={td}><TrendBadge c={a.trend.classification} /></td>
                  <td className={td}>{a.trend.salesPeriod ? Math.round(a.trend.salesPeriod.value) : "—"} <span className="text-xs text-mute">{signedPct(a.trend.growthPeriod)}</span></td>
                  <td className={td}>{pct(a.calc?.contributionPct)}</td>
                  <td className={td}><RecBadge rec={a.score.recommendation} confirmed={a.score.confirmed} /></td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Alertas recentes" actions={<Link href="/alertas" className="text-xs text-brand-blue">todos →</Link>}>
            {!ctx.limits.alerts ? (
              <p className="text-sm text-mute">Alertas de preço, concorrentes e margem estão nos planos pagos. <Link className="text-brand-blue" href="/assinatura">Ver planos</Link></p>
            ) : alerts.length === 0 ? (
              <p className="text-sm text-mute">Nenhum alerta novo.</p>
            ) : (
              <ul className="space-y-2 text-sm">{alerts.map((a) => <li key={a.id}><div className="text-ink">{a.title}</div><div className="text-xs text-mute">{a.body}</div></li>)}</ul>
            )}
          </Card>
          <Card title="Tendências">
            <div className="space-y-2">
              {(Object.keys(TREND_LABELS) as TrendClass[]).map((c) => (
                <div key={c} className="flex items-center justify-between text-sm">
                  <TrendBadge c={c} />
                  <span className="text-mute">{counts[c] ?? 0}</span>
                </div>
              ))}
            </div>
            <Link href="/tendencias" className={`${btnGhost} mt-4 w-full`}>Abrir Radar</Link>
          </Card>
          <Card title="Seu plano">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-mute">Plano</span><Badge tone="green">{ctx.planName}</Badge></li>
              <li className="flex justify-between"><span className="text-mute">Produtos</span><span>{u.products} / {ctx.limits.products < 0 ? "∞" : ctx.limits.products}</span></li>
              <li className="flex justify-between"><span className="text-mute">Relatórios no mês</span><span>{u.aiReports} / {ctx.limits.aiReports < 0 ? "∞" : ctx.limits.aiReports}</span></li>
              <li className="flex justify-between gap-3"><span className="text-mute">Tabela de comissão</span><span className="text-right text-xs">{fee.name}</span></li>
              <li className="flex justify-between"><span className="text-mute">Item de R$ 39,90</span><span>{brl(39.9 * fee.rules.bands[0].pct + fee.rules.bands[0].fixed)} de tarifa</span></li>
            </ul>
            <Link href="/assinatura" className={`${btnGhost} mt-4 w-full`}>Gerenciar plano</Link>
          </Card>
        </div>
      </div>
    </>
  );
}
