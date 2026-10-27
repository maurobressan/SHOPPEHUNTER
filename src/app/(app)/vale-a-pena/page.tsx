import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCtx } from "@/lib/auth";
import { scope } from "@/lib/settings";
import { analyzeById } from "@/lib/analysis";
import { parseShopeeUrl } from "@/lib/ext";
import { verdict, type Light, type VerdictKey } from "@/lib/verdict";
import { Card, PageHeader, Empty, Notice, btnPrimary, input, DemoTag } from "@/components/ui";
import { str } from "@/lib/format";
import type { SP } from "@/components/Flash";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ArrowRight } from "lucide-react";

export const metadata = { title: "Vale a pena?" };

const LIGHT: Record<Light, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  ok: { icon: CheckCircle2, cls: "text-ok", label: "bom" },
  atencao: { icon: AlertTriangle, cls: "text-warn", label: "atenção" },
  ruim: { icon: XCircle, cls: "text-bad", label: "ruim" },
  sem_dados: { icon: HelpCircle, cls: "text-mute", label: "sem dados" },
};

const HERO: Record<VerdictKey, string> = {
  comprar: "from-[#12894c] to-[#22c55e]",
  monitorar: "from-[#b45309] to-[#f59e0b]",
  evitar: "from-[#b91c1c] to-[#ef4444]",
  faltam_dados: "from-[#334155] to-[#64748b]",
};

export default async function ValeAPena({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const where = await scope(ctx.accountId);
  const products = await prisma.product.findMany({ where: { ...where, status: { not: "descartado" } }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, isDemo: true } });

  let pid = str(sp.p);
  const link = str(sp.link);
  let linkError = "";
  if (link) {
    const ids = parseShopeeUrl(link);
    const listing = ids ? await prisma.listing.findFirst({ where: { accountId: ctx.accountId, shopId: ids.shopId, externalItemId: ids.itemId }, select: { productId: true } }) : null;
    if (!ids) linkError = "Não reconheci esse link. Copie o endereço da página do anúncio na Shopee.";
    else if (!listing?.productId) linkError = "Esse anúncio ainda não está no Hunter. Abra o anúncio com a extensão e clique em Salvar no Hunter (ou salve a busca inteira).";
    else pid = listing.productId;
  }
  const a = pid ? await analyzeById(ctx.accountId, pid, 30) : null;
  const v = a ? verdict(a) : null;

  return (
    <>
      <PageHeader title="Vale a pena?" subtitle="Escolha um produto ou cole o link de um anúncio: o Hunter junta procura, concorrência, margem e o dinheiro do lote numa resposta só." />

      <Card className="mb-6">
        <form className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">Produto</span>
            <select name="p" defaultValue={a?.product.id ?? ""} className={input}>
              <option value="">Escolha…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.isDemo && !p.name.startsWith("[DEMO]") ? "[DEMO] " : ""}{p.name}</option>)}
            </select>
          </label>
          <span className="pb-2 text-center text-sm text-mute">ou</span>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">Link do anúncio na Shopee</span>
            <input name="link" defaultValue={link} placeholder="https://shopee.com.br/…-i.123.456" className={input} />
          </label>
          <button className={btnPrimary}>Analisar</button>
        </form>
        {linkError && <div className="mt-4"><Notice tone="amber">{linkError}</Notice></div>}
      </Card>

      {!a || !v ? (
        products.length ? (
          <Empty title="Escolha um produto para ver o veredito">Cada item mostra o número usado e a regra aplicada. Nada é inventado: sem dados, o Hunter diz que ainda não dá para decidir.</Empty>
        ) : (
          <Empty title="Você ainda não tem produtos">Salve concorrentes pela <Link href="/extensao" className="font-semibold text-brand-blue">extensão do Chrome</Link> ou cadastre em <Link href="/meus-produtos" className="font-semibold text-brand-blue">Meus produtos</Link>.</Empty>
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <div className={`rounded-3xl bg-gradient-to-br ${HERO[v.key]} p-6 text-white shadow-lift`}>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white/85">
                <Link href={`/produtos/${a.product.id}`} className="hover:underline">{a.product.name}</Link> <DemoTag show={a.product.isDemo} />
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight">{v.title}</div>
              <p className="mt-2 max-w-xl text-white/90">{v.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-white/20 px-3 py-1">Confiança dos dados {(a.score.confidence * 100).toFixed(0)}%</span>
                <span className="rounded-full bg-white/20 px-3 py-1">Últimos 30 dias</span>
                {a.salePrice && <span className="rounded-full bg-white/20 px-3 py-1">Preço considerado {a.salePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ({a.salePriceSource})</span>}
              </div>
            </div>

            <Card title="Como chegamos nessa resposta">
              <ul className="divide-y divide-line">
                {v.criteria.map((c) => {
                  const L = LIGHT[c.light];
                  return (
                    <li key={c.label} className="flex gap-3 py-3">
                      <L.icon size={22} className={`mt-0.5 shrink-0 ${L.cls}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-bold text-ink">{c.label}</span>
                          <span className={`text-xs font-bold uppercase ${L.cls}`}>{L.label}</span>
                        </div>
                        <div className="text-sm text-ink/90">{c.value}</div>
                        <div className="mt-0.5 text-xs text-mute">{c.explain}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Próximos passos">
              <ul className="space-y-2">
                {v.nextSteps.map((s) => (
                  <li key={s.href + s.text}>
                    <Link href={s.href} className="group flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-ink transition hover:border-brand-blue/40 hover:bg-panel2/60">
                      <span className="flex-1">{s.text}</span>
                      <ArrowRight size={16} className="text-mute group-hover:text-brand-blue" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            {(a.score.risks.length > 0 || a.score.advantages.length > 0) && (
              <Card title="Pontos fortes e riscos">
                {a.score.advantages.map((x) => <div key={x} className="text-sm text-ok">+ {x}</div>)}
                {a.score.risks.map((x) => <div key={x} className="mt-1 text-sm text-bad">− {x}</div>)}
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
