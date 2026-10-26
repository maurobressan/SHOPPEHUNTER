import Link from "next/link";
import { prisma } from "@/lib/db";
import { scope } from "@/lib/settings";
import { requireCtx } from "@/lib/auth";
import { affiliateConfig } from "@/lib/sources/shopee-affiliate";
import { collectSearch } from "@/lib/collector";
import { salesInWindow } from "@/lib/trends";
import { groupSimilar } from "@/lib/similarity";
import { linkListings, addManualListing } from "@/app/actions/app";
import { Card, PageHeader, Notice, Table, td, Badge, DemoTag, Field, input, btnPrimary, btnGhost, Empty, EstTag } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";
import { brl, int, periodParam, str, PERIODS } from "@/lib/format";
import { DAY } from "@/lib/stats";
import { norm } from "@/lib/import/orders";

export default async function Explorar({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = str(sp.q).trim();
  const cat = str(sp.cat).trim();
  const sort = Number(str(sp.sort)) || 2;
  const periodo = periodParam(sp.periodo);
  const minPrice = Number(str(sp.min)) || 0;
  const maxPrice = Number(str(sp.max)) || Infinity;
  const minSales = Number(str(sp.vendas)) || 0;
  const ctx = await requireCtx();
  const aff = !!affiliateConfig() && ctx.limits.autoCollect;
  const where = await scope(ctx.accountId);

  let apiMsg: { ok: boolean; message: string } | null = null;
  if (aff && (q || cat)) {
    const r = await collectSearch(ctx.accountId, { keyword: q || undefined, productCatId: cat ? Number(cat) : undefined, sortType: sort as 1 | 2 | 3 | 4 | 5, limit: 50 });
    apiMsg = { ok: r.ok, message: r.message + (r.hasNextPage ? " Há mais resultados além desta página." : "") };
  }
  // Busca sem diferenciar maiúsculas/acentos e igual em SQLite e PostgreSQL: filtra títulos em memória.
  const words = norm(q).split(" ").filter(Boolean);
  const candidates = q || cat ? await prisma.listing.findMany({ where, select: { id: true, title: true, categoryIds: true } }) : [];
  const matchIds = candidates
    .filter((l) => (!words.length || words.some((w) => norm(l.title).includes(w))) && (!cat || l.categoryIds.split(",").includes(cat)))
    .slice(0, 300)
    .map((l) => l.id);
  const listings = matchIds.length
    ? await prisma.listing.findMany({ where: { id: { in: matchIds }, accountId: ctx.accountId }, include: { snapshots: { orderBy: { referenceDate: "asc" } }, product: true } })
    : [];
  const now = new Date();
  const rows = listings
    .map((l) => {
      const last = l.snapshots[l.snapshots.length - 1];
      const period = salesInWindow(
        l.snapshots.map((x) => ({ t: x.referenceDate, price: x.price, salesCumulative: x.salesCumulative, ratingCount: x.ratingCount, ratingStar: x.ratingStar })),
        new Date(now.getTime() - periodo * DAY),
        now,
      );
      return { l, last, period };
    })
    .filter(({ last, period }) => (last?.price ?? 0) >= minPrice && (last?.price ?? 0) <= maxPrice && (minSales === 0 || (period?.value ?? 0) >= minSales))
    .sort((a, b) => (b.period?.value ?? -1) - (a.period?.value ?? -1) || (b.last?.salesCumulative ?? 0) - (a.last?.salesCumulative ?? 0));
  const groups = groupSimilar(rows.map((r) => ({ id: r.l.id, title: r.l.title, price: r.last?.price ?? null }))).filter((g) => g.length > 1);
  const groupOf = new Map<string, number>();
  groups.forEach((g, i) => g.forEach((x) => groupOf.set(x.id, i + 1)));
  const products = await prisma.product.findMany({ where: { ...where, status: { not: "descartado" } }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });
  const backUrl = `/explorar?q=${encodeURIComponent(q)}&cat=${cat}&periodo=${periodo}`;

  return (
    <>
      <PageHeader title="Explorar Produtos" subtitle="Pesquise por palavra-chave ou categoria. Cada busca pela API oficial grava um snapshot (1 por anúncio por dia) para formar o histórico." />
      <Flash sp={sp} />
      {!aff && (
        <div className="mb-5">
          <Notice tone="amber">
            <b>Busca direta na Shopee {affiliateConfig() ? "disponível nos planos pagos" : "não configurada no servidor"}.</b> A Shopee não oferece API pública de vendas de outros vendedores; a API oficial de Afiliados informa preço, nota e vendas <b>acumuladas</b>. Enquanto isso, a busca abaixo procura nos anúncios já salvos na sua conta. Para capturar anúncios enquanto navega na Shopee, use a <Link className="underline" href="/conta#extensao">extensão Salvar no Hunter</Link>{!ctx.limits.autoCollect && <> ou <Link className="underline" href="/assinatura">faça upgrade</Link></>}.
          </Notice>
        </div>
      )}
      {apiMsg && <div className="mb-5"><Notice tone={apiMsg.ok ? "green" : "red"}>Shopee Afiliados: {apiMsg.message}</Notice></div>}

      <Card>
        <form className="grid gap-3 md:grid-cols-8">
          <div className="md:col-span-3"><Field label="Palavra-chave"><input name="q" defaultValue={q} placeholder="ex.: garrafa térmica" className={input} /></Field></div>
          <Field label="ID categoria"><input name="cat" defaultValue={cat} placeholder="opcional" className={input} /></Field>
          <Field label="Ordenar (API)">
            <select name="sort" defaultValue={sort} className={input}>
              <option value={2}>Mais vendidos</option><option value={1}>Relevância</option><option value={4}>Menor preço</option><option value={3}>Maior preço</option>
            </select>
          </Field>
          <Field label="Período">
            <select name="periodo" defaultValue={periodo} className={input}>{PERIODS.map((p) => <option key={p} value={p}>{p} dias</option>)}</select>
          </Field>
          <Field label="Preço mín./máx."><div className="flex gap-1"><input name="min" defaultValue={str(sp.min)} className={input} placeholder="0" /><input name="max" defaultValue={str(sp.max)} className={input} placeholder="∞" /></div></Field>
          <Field label="Vendas mín. período"><input name="vendas" defaultValue={str(sp.vendas)} className={input} placeholder="0" /></Field>
          <div className="md:col-span-8"><button className={btnPrimary}>Pesquisar</button></div>
        </form>
      </Card>

      <div className="mt-6">
        {!q && !cat ? (
          <Empty title="Digite uma palavra-chave para começar" />
        ) : rows.length === 0 ? (
          <Empty title="Nenhum anúncio encontrado">{aff ? "Tente outra palavra-chave." : "Nenhum anúncio gravado com esse termo. Cadastre manualmente abaixo ou configure a API."}</Empty>
        ) : (
          <form action={linkListings}>
            <input type="hidden" name="_back" value={backUrl} />
            <input type="hidden" name="q" value={q} />
            <Table head={["", "Anúncio", "Loja", "Preço", `Vendas ${periodo}d`, "Vendas acumuladas*", "Nota", "Snapshots", "Produto"]}>
              {rows.map(({ l, last, period }) => (
                <tr key={l.id} className="hover:bg-panel2/40">
                  <td className={td}><input type="checkbox" name="listing" value={l.id} /></td>
                  <td className={`${td} max-w-md`}>
                    {l.url ? <a href={l.url} target="_blank" rel="noreferrer" className="hover:text-brand-blue">{l.title}</a> : l.title} <DemoTag show={l.isDemo} />
                    {groupOf.has(l.id) && <Badge tone="violet" title="Título/preço muito parecidos com outros anúncios: possivelmente o mesmo produto">grupo {groupOf.get(l.id)}</Badge>}
                  </td>
                  <td className={td}>{l.shopName || "—"}</td>
                  <td className={td}>{brl(last?.price)}</td>
                  <td className={td}>{period ? <>{int(period.value)} <EstTag observed={period.observed} confidence={period.confidence} /></> : <span className="text-xs text-mute">sem histórico</span>}</td>
                  <td className={td}>{int(last?.salesCumulative)}</td>
                  <td className={td}>{last?.ratingStar?.toFixed(1) ?? "—"}</td>
                  <td className={td}>{l.snapshots.length}</td>
                  <td className={td}>{l.product ? <Link className="text-brand-blue" href={`/produtos/${l.product.id}`}>{l.product.name}</Link> : "—"}</td>
                </tr>
              ))}
            </Table>
            <p className="mt-2 text-xs text-mute">* Vendas acumuladas = total histórico informado pela fonte, NÃO são vendas do período. Vendas do período são calculadas pela diferença entre snapshots.</p>
            <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-panel p-4">
              <Field label="Vincular selecionados ao produto">
                <select name="productId" className={input} defaultValue="__new">
                  <option value="__new">+ Novo produto…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Nome do novo produto"><input name="newName" defaultValue={q} className={input} /></Field>
              <button className={btnGhost}>Salvar na minha lista</button>
            </div>
          </form>
        )}
      </div>

      <Card title="Cadastrar anúncio observado manualmente" className="mt-6">
        <form action={addManualListing} className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="_back" value={backUrl} />
          <Field label="Produto">
            <select name="productId" className={input} required>
              <option value="">Selecione…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="md:col-span-2"><Field label="Título do anúncio"><input name="title" className={input} required /></Field></div>
          <Field label="Loja"><input name="shopName" className={input} /></Field>
          <div className="md:col-span-2"><Field label="Link do anúncio"><input name="url" type="url" className={input} placeholder="https://shopee.com.br/..." /></Field></div>
          <Field label="Preço observado (R$)"><input name="price" className={input} /></Field>
          <Field label="Vendidos (acumulado exibido)" hint="Número total exibido no anúncio"><input name="salesCumulative" className={input} /></Field>
          <Field label="Nota"><input name="ratingStar" className={input} /></Field>
          <Field label="Nº de avaliações"><input name="ratingCount" className={input} /></Field>
          <Field label="Data da observação"><input name="referenceDate" type="date" className={input} /></Field>
          <div className="flex items-end"><button className={btnPrimary}>Cadastrar</button></div>
        </form>
      </Card>
    </>
  );
}
