import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { getSettings, getActiveFeeSchedule } from "@/lib/settings";
import { saveSettingsAction, setDemo, resetDemo, collectAllAction } from "@/app/actions/app";
import { Card, PageHeader, Field, input, btnPrimary, btnGhost, btnDanger, Table, td, Badge, Notice } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";
import { date, dateTime } from "@/lib/format";
import type { FeeRules } from "@/lib/fees";

export const metadata = { title: "Configurações" };

const REGIMES = [
  ["nao_configurado", "Não configurado"],
  ["mei", "MEI (DAS fixo mensal: lance em despesas fixas)"],
  ["simples", "Simples Nacional (alíquota efetiva)"],
  ["presumido", "Lucro Presumido"],
  ["real", "Lucro Real"],
  ["cpf", "Pessoa física (CPF)"],
];

export default async function Configuracoes({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const s = await getSettings(ctx.accountId);
  const [schedules, runs, active] = await Promise.all([
    prisma.feeSchedule.findMany({ where: { sellerType: s.sellerType }, orderBy: { validFrom: "desc" } }),
    prisma.collectionRun.findMany({ where: { accountId: ctx.accountId }, orderBy: { startedAt: "desc" }, take: 8 }),
    getActiveFeeSchedule(s.sellerType),
  ]);
  const readOnly = ctx.role === "member";

  return (
    <>
      <PageHeader title="Configurações" subtitle="Seu regime tributário, custos padrão, alertas e pesos do Hunter Score. Valem para toda a equipe desta conta." />
      <Flash sp={sp} />
      {readOnly && <div className="mb-4"><Notice tone="amber">Apenas o dono ou administradores da conta podem alterar estas configurações.</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Seu negócio e custos padrão" className="lg:col-span-2">
          <form action={saveSettingsAction} className="grid gap-3 md:grid-cols-3">
            <fieldset disabled={readOnly} className="contents">
              <Field label="Tipo de vendedor"><select name="sellerType" defaultValue={s.sellerType} className={input}><option>CNPJ</option><option>CPF</option></select></Field>
              <label className="flex items-end gap-2 pb-2 text-sm text-mute"><input type="checkbox" name="cpfHighVolume" defaultChecked={s.cpfHighVolume} /> CPF com +450 pedidos/90 dias</label>
              <Field label="Regime tributário"><select name="taxRegime" defaultValue={s.taxRegime} className={input}>{REGIMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="Alíquota sobre a receita (%)" hint="Informe a SUA alíquota efetiva. Não presumimos valores."><input name="taxPct" defaultValue={s.taxPct} className={input} /></Field>
              <Field label="Embalagem por pedido (R$)"><input name="packagingCost" defaultValue={s.packagingCost} className={input} /></Field>
              <Field label="Frete pago por você (R$/pedido)"><input name="shippingCost" defaultValue={s.shippingCost} className={input} /></Field>
              <Field label="Anúncios (% receita)"><input name="adsPct" defaultValue={s.adsPct} className={input} /></Field>
              <Field label="Provisão perdas/devoluções (%)"><input name="lossPct" defaultValue={s.lossPct} className={input} /></Field>
              <Field label="Outros custos variáveis (R$/pedido)"><input name="otherVariableCost" defaultValue={s.otherVariableCost} className={input} /></Field>
              <Field label="Despesas fixas mensais (R$)" hint="rateadas separadamente"><input name="fixedMonthly" defaultValue={s.fixedMonthly} className={input} /></Field>
              <Field label="Lote de teste padrão (un.)"><input name="testLotUnits" defaultValue={s.testLotUnits} className={input} /></Field>
              <Field label="Prazo de repasse da Shopee (dias)" hint="usado no fluxo de caixa"><input name="payoutDelayDays" defaultValue={s.payoutDelayDays} className={input} /></Field>
              <div className="mt-2 text-xs font-semibold uppercase text-mute md:col-span-3">Alertas</div>
              <Field label="Avisar se concorrente baixar o preço em (%)"><input name="alertPriceDropPct" defaultValue={s.alertPriceDropPct} className={input} /></Field>
              <Field label="Avisar se a margem ficar abaixo de (%)"><input name="alertMinMarginPct" defaultValue={s.alertMinMarginPct} className={input} /></Field>
              <div className="hidden md:block" />
              <div className="mt-2 text-xs font-semibold uppercase text-mute md:col-span-3">Pesos do Hunter Score (normalizados automaticamente)</div>
              <Field label="Demanda"><input name="w_demand" defaultValue={s.weights.demand} className={input} /></Field>
              <Field label="Crescimento"><input name="w_growth" defaultValue={s.weights.growth} className={input} /></Field>
              <Field label="Concorrência"><input name="w_competition" defaultValue={s.weights.competition} className={input} /></Field>
              <Field label="Margem"><input name="w_margin" defaultValue={s.weights.margin} className={input} /></Field>
              <Field label="Fornecedores"><input name="w_suppliers" defaultValue={s.weights.suppliers} className={input} /></Field>
              <div className="flex items-end"><button className={btnPrimary}>Salvar</button></div>
            </fieldset>
          </form>
        </Card>

        <div className="space-y-6">
          <Card title="Modo DEMO">
            <p className="mb-3 text-sm text-mute">Dados fictícios para conhecer o sistema. Ficam marcados com [DEMO] e nunca se misturam aos reais quando o modo está desligado.</p>
            <div className="flex flex-wrap gap-2">
              <form action={setDemo}><input type="hidden" name="on" value={s.demoMode ? "0" : "1"} /><button disabled={readOnly} className={s.demoMode ? btnGhost : btnPrimary}>{s.demoMode ? "Desativar DEMO" : "Ativar DEMO"}</button></form>
              <form action={resetDemo}><input type="hidden" name="mode" value="seed" /><button disabled={readOnly} className={btnGhost}>Recriar dados</button></form>
              <form action={resetDemo}><input type="hidden" name="mode" value="clear" /><button disabled={readOnly} className={btnDanger}>Apagar DEMO</button></form>
            </div>
          </Card>
          <Card title="Coleta automática">
            <p className="text-sm text-mute">
              {ctx.limits.autoCollect
                ? "Seu plano inclui a coleta diária dos produtos com palavras-chave (API oficial de Afiliados da Shopee)."
                : "A coleta diária automática está disponível nos planos pagos. No seu plano, use a extensão ou o registro manual."}
            </p>
            {ctx.limits.autoCollect && <form action={collectAllAction} className="mt-3"><button disabled={readOnly} className={btnGhost}>Coletar todos agora</button></form>}
            {runs.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-mute">
                {runs.map((r) => <li key={r.id}><Badge tone={r.status === "ok" ? "green" : r.status === "erro" ? "red" : "amber"}>{r.status}</Badge> {dateTime(r.startedAt)} — {r.message.slice(0, 80)}</li>)}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title={`Tabela de comissão em uso (${s.sellerType})`} className="mt-6">
        <p className="mb-3 text-sm text-mute">Mantida pela plataforma com base na documentação oficial da Shopee e versionada por data de vigência. Em uso agora: <b className="text-ink">{active.name}</b>.</p>
        <Table head={["Versão", "Vigência", "Regras", "Fonte"]}>
          {schedules.map((f) => {
            const r = JSON.parse(f.rules) as FeeRules;
            return (
              <tr key={f.id}>
                <td className={td}>{f.name} {f.id === active.id && <Badge tone="green">vigente</Badge>}</td>
                <td className={td}>{date(f.validFrom)} → {f.validTo ? date(f.validTo) : "atual"}</td>
                <td className={`${td} text-xs text-mute`}>{r.bands.map((b) => `≥R$${b.min}: ${(b.pct * 100).toFixed(0)}%+R$${b.fixed}`).join(" · ")}<div>{f.notes}</div></td>
                <td className={td}><a href={f.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-blue">{f.sourceTitle || "fonte"}</a></td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
