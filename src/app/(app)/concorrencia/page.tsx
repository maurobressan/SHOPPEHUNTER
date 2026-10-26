import Link from "next/link";
import { prisma } from "@/lib/db";
import { scope } from "@/lib/settings";
import { requireCtx } from "@/lib/auth";
import { analyzeById } from "@/lib/analysis";
import { toggleListingFlag, unlinkListing } from "@/app/actions/app";
import { Card, PageHeader, Table, td, Stat, Empty, Badge, Notice, DemoTag } from "@/components/ui";
import { ProductPicker } from "@/components/ProductPicker";
import { Flash, type SP } from "@/components/Flash";
import { brl, int, pct, str } from "@/lib/format";

export default async function Concorrencia({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const products = await prisma.product.findMany({ where: await scope(ctx.accountId), orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });
  const pid = str(sp.p) || products[0]?.id;
  const a = pid ? await analyzeById(ctx.accountId, pid, 30) : null;
  const c = a?.competition;
  const backUrl = `/concorrencia?p=${pid}`;

  return (
    <>
      <PageHeader title="Analisar Concorrência" subtitle="Vale a pena entrar neste nicho? Análise dos anúncios OBSERVADOS (coletados pela API ou cadastrados por você).">
        <ProductPicker products={products} current={pid} base="/concorrencia" />
      </PageHeader>
      <Flash sp={sp} />
      {!a || !c ? (
        <Empty title="Selecione ou cadastre um produto">Os concorrentes de um produto são os anúncios vinculados a ele (via Explorar Produtos ou cadastro manual).</Empty>
      ) : c.observedListings === 0 ? (
        <Empty title="Nenhum anúncio concorrente vinculado">Vá em <Link className="text-brand-blue" href={`/explorar?q=${encodeURIComponent(a.product.keywords || a.product.name)}`}>Explorar Produtos</Link> e vincule anúncios a este produto.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <Stat label="Saturação" value={c.saturation === null ? "—" : `${c.saturation.toFixed(0)}/100`} tone={c.saturation !== null && c.saturation >= 70 ? "red" : c.saturation !== null && c.saturation <= 40 ? "green" : "amber"} hint="maior = mais concorrido" />
            <Stat label="Anúncios observados" value={c.observedListings} hint={c.pageLimitReached ? "estimado: ≥ este número (limite da busca)" : "concorrência observada"} />
            <Stat label="Vendedores" value={c.observedShops} />
            <Stat label="Preço mediano" value={brl(c.price?.median)} hint={c.price ? `${brl(c.price.min)} – ${brl(c.price.max)}` : undefined} />
            <Stat label="Diferença mín./máx." value={pct(c.price?.spreadPct, 0)} />
            <Stat label="Top 3 vendedores" value={pct(c.top3ShopShare, 0)} hint={c.hhi !== null ? `HHI ${c.hhi.toFixed(0)} (acumulado)` : undefined} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card title="Como a saturação foi calculada">
              {c.saturationParts.length === 0 ? <p className="text-sm text-mute">São necessários ao menos 3 anúncios.</p> : (
                <ul className="space-y-2 text-sm">
                  {c.saturationParts.map((p) => (
                    <li key={p.label}>
                      <div className="flex justify-between text-mute"><span>{p.label}</span><span>peso {(p.weight * 100).toFixed(0)}%</span></div>
                      <div className="mt-1 h-2 rounded bg-panel2"><div className="h-full rounded bg-brand-blue" style={{ width: `${p.value * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-mute">Concentração calculada sobre vendas ACUMULADAS dos anúncios observados — indício, não participação real de mercado.</p>
            </Card>
            <Card title="Oportunidades de diferenciação" className="lg:col-span-2">
              {c.opportunities.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-ink/90">{c.opportunities.map((o) => <li key={o}>{o}</li>)}</ul> : <p className="text-sm text-mute">Sem sinais nos dados. Avalie os anúncios abaixo e marque fotos/descrições fracas para enriquecer a análise.</p>}
              {c.kitIdeas.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold uppercase text-mute">Kits/combos (preço do kit = mediana × unidades × 0,95)</div>
                  <Table head={["Kit", "Preço do kit", "Tarifas vendendo separado", "Tarifas no kit", "Economia de tarifa"]}>
                    {c.kitIdeas.map((k) => (
                      <tr key={k.units}><td className={td}>{k.units} un.</td><td className={td}>{brl(k.kitPrice)}</td><td className={td}>{brl(k.feeSeparate)}</td><td className={td}>{brl(k.feeKit)}</td><td className={`${td} text-ok`}>{brl(k.saving)}</td></tr>
                    ))}
                  </Table>
                </div>
              )}
            </Card>
          </div>
          {a.similarGroups.length > 0 && (
            <div className="mt-6"><Notice tone="blue">{a.similarGroups.length} grupo(s) de anúncios parecem ser o mesmo produto com títulos diferentes (similaridade de título + preço). Ex.: {a.similarGroups[0].map((g) => `"${g.title}"`).slice(0, 3).join(", ")}.</Notice></div>
          )}
          <Card title="Principais anúncios concorrentes" className="mt-6">
            <Table head={["Anúncio", "Loja", "Preço", "Vendas acumuladas", "Nota", "Qualidade (sua avaliação)", ""]}>
              {a.product.listings
                .map((l) => ({ l, last: l.snapshots[l.snapshots.length - 1] }))
                .sort((x, y) => (y.last?.salesCumulative ?? -1) - (x.last?.salesCumulative ?? -1))
                .map(({ l, last }) => (
                  <tr key={l.id} className="hover:bg-panel2/40">
                    <td className={`${td} max-w-md`}>{l.url ? <a href={l.url} target="_blank" rel="noreferrer" className="hover:text-brand-blue">{l.title}</a> : l.title} <DemoTag show={l.isDemo} /></td>
                    <td className={td}>{l.shopName || "—"}</td>
                    <td className={td}>{brl(last?.price)}</td>
                    <td className={td}>{int(last?.salesCumulative)}</td>
                    <td className={td}>{last?.ratingStar?.toFixed(1) ?? "—"}</td>
                    <td className={td}>
                      <div className="flex gap-1">
                        {(["weakPhotos", "weakDescription"] as const).map((flag) => (
                          <form key={flag} action={toggleListingFlag}>
                            <input type="hidden" name="id" value={l.id} /><input type="hidden" name="flag" value={flag} /><input type="hidden" name="_back" value={backUrl} />
                            <button title="Clique para alternar"><Badge tone={l[flag] ? "amber" : "default"}>{flag === "weakPhotos" ? "fotos fracas" : "descrição fraca"}{l[flag] ? " ✓" : ""}</Badge></button>
                          </form>
                        ))}
                      </div>
                    </td>
                    <td className={td}>
                      <form action={unlinkListing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="_back" value={backUrl} /><button className="text-xs text-mute hover:text-bad">desvincular</button></form>
                    </td>
                  </tr>
                ))}
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
