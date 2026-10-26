import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { markAlertsRead } from "@/app/actions/app";
import { Card, PageHeader, Empty, Badge, Notice, btnGhost } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Alertas" };

const TONE: Record<string, "red" | "amber" | "blue" | "default"> = { preco: "amber", concorrente: "blue", margem: "red", tendencia: "blue" };
const LABEL: Record<string, string> = { preco: "preço", concorrente: "concorrente", margem: "margem", tendencia: "tendência", sistema: "sistema" };

export default async function Alertas({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const items = await prisma.notification.findMany({ where: { accountId: ctx.accountId }, orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { id: true, name: true } } } });
  const unread = items.filter((i) => !i.readAt).length;
  return (
    <>
      <PageHeader title="Alertas" subtitle="Avisos automáticos depois de cada coleta ou captura: queda de preço de concorrentes, novos concorrentes e margem abaixo do mínimo.">
        {unread > 0 && <form action={markAlertsRead}><button className={btnGhost}>Marcar todos como lidos</button></form>}
      </PageHeader>
      <Flash sp={sp} />
      {!ctx.limits.alerts && <div className="mb-5"><Notice tone="amber">Seu plano não inclui alertas automáticos. <Link className="underline" href="/assinatura">Ver planos</Link></Notice></div>}
      {items.length === 0 ? (
        <Empty title="Nenhum alerta ainda">Os alertas aparecem quando novos dados chegam pela coleta automática, pela extensão ou pelo registro manual. Ajuste os limites em Configurações.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {items.map((a) => (
              <li key={a.id} className={`flex flex-wrap items-start gap-3 py-3 ${a.readAt ? "opacity-60" : ""}`}>
                <Badge tone={TONE[a.kind] ?? "default"}>{LABEL[a.kind] ?? a.kind}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink">{a.title}</div>
                  <div className="text-xs text-mute">{a.body}</div>
                  <div className="mt-1 text-[11px] text-mute">{dateTime(a.createdAt)}{a.product && <> · <Link className="text-brand-blue" href={`/produtos/${a.product.id}`}>abrir produto</Link></>}</div>
                </div>
                {!a.readAt && (
                  <form action={markAlertsRead}><input type="hidden" name="id" value={a.id} /><button className="text-xs text-mute hover:text-ink">marcar como lido</button></form>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
