import Link from "next/link";
import { prisma } from "@/lib/db";
import { scope, getActiveFeeSchedule, getSettings } from "@/lib/settings";
import { requireCtx } from "@/lib/auth";
import { analyzeById, baseCalcInput, feeOpts } from "@/lib/analysis";
import { calculate } from "@/lib/calculator";
import { createSupplierQuote, deleteQuote, chooseQuote } from "@/app/actions/app";
import { Card, PageHeader, Table, td, Empty, Badge, Notice, Field, input, btnPrimary, btnGhost, DemoTag } from "@/components/ui";
import { ProductPicker } from "@/components/ProductPicker";
import { Flash, type SP } from "@/components/Flash";
import { brl, date, pct, str } from "@/lib/format";
import { ExternalLink } from "lucide-react";

const KIND_LABEL: Record<string, string> = { fabrica: "Fábrica", distribuidora: "Distribuidora", atacadista: "Atacadista", importador: "Importador nacional", varejo: "Varejo (não atacadista)", internacional: "Internacional" };

export default async function Fornecedores({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const where = await scope(ctx.accountId);
  const products = await prisma.product.findMany({ where, orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });
  const pid = str(sp.p) || products[0]?.id;
  const settings = await getSettings(ctx.accountId);
  const [a, suppliers, fee] = await Promise.all([
    pid ? analyzeById(ctx.accountId, pid, 30) : null,
    prisma.supplier.findMany({ where, orderBy: { name: "asc" } }),
    getActiveFeeSchedule(settings.sellerType),
  ]);
  const backUrl = `/fornecedores?p=${pid}`;
  const term = a ? (a.product.keywords.split(",")[0] || a.product.name).replace("[DEMO] ", "").trim() : "";
  const g = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const links = term
    ? [
        { label: "Atacadistas no Brasil", url: g(`"${term}" atacado fornecedor`) },
        { label: "Distribuidoras (CNPJ)", url: g(`${term} distribuidora atacado CNPJ`) },
        { label: "Fábricas nacionais", url: g(`${term} fábrica fabricante Brasil venda atacado`) },
        { label: "Importadores nacionais", url: g(`${term} importadora atacado revenda`) },
        { label: "Polos: Brás / 25 de Março", url: g(`${term} atacado Brás 25 de Março`) },
        { label: "Alibaba (internacional)", url: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(term)}` },
      ]
    : [];
  const salePrice = a?.salePrice ?? null;

  return (
    <>
      <PageHeader title="Encontrar Fornecedores" subtitle="Pesquise, registre e compare fornecedores reais. Preços sem fonte aparecem como “Sob consulta” — nada é inventado.">
        <ProductPicker products={products} current={pid} base="/fornecedores" />
      </PageHeader>
      <Flash sp={sp} />
      {!a ? (
        <Empty title="Cadastre um produto primeiro"><Link className="text-brand-blue" href="/meus-produtos">Meus Produtos</Link></Empty>
      ) : (
        <>
          <Card title={`Pesquisar fornecedores para “${term}”`}>
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className={btnGhost}>{l.label} <ExternalLink size={14} /></a>
              ))}
            </div>
            <p className="mt-3 text-xs text-mute">
              Limitação: não há API gratuita e autorizada que liste atacadistas brasileiros com preços. Os botões abrem buscas prontas (prioridade para fornecedores nacionais); registre abaixo o que encontrar ou as cotações recebidas por WhatsApp/e-mail, com data e fonte.
            </p>
          </Card>

          <Card title="Comparativo de cotações" className="mt-6">
            {a.product.quotes.length === 0 ? (
              <p className="text-sm text-mute">Nenhuma cotação registrada para este produto.</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-mute">Margem calculada ao preço de venda {brl(salePrice)} ({a.salePriceSource ?? "defina um preço-alvo no produto"}), com custos padrão das Configurações. Frete do lote rateado pela compra mínima (ou lote de teste de {settings.testLotUnits} un.).</p>
                <Table head={["Fornecedor", "Tipo", "Preço unit.", "Mín.", "Frete lote", "Custo unit. c/ frete", "Prazo", "Margem", "Investimento", "Cotação", ""]}>
                  {a.product.quotes.map((q) => {
                    const lot = q.moq ?? settings.testLotUnits;
                    const landed = q.unitPrice === null ? null : q.unitPrice + (q.shippingCost ?? 0) / Math.max(1, lot);
                    const r = landed !== null && salePrice ? calculate(baseCalcInput(settings, salePrice, landed), fee.rules, feeOpts(settings)) : null;
                    const chosen = a.chosenQuote?.id === q.id;
                    return (
                      <tr key={q.id} className={chosen ? "bg-brand-green/5" : ""}>
                        <td className={td}>
                          <div className="font-medium">{q.supplier.name} <DemoTag show={q.isDemo} /></div>
                          <div className="text-xs text-mute">{q.supplier.country}{q.supplier.location ? ` · ${q.supplier.location}` : ""}{q.supplier.contact ? ` · ${q.supplier.contact}` : ""}</div>
                          {q.supplier.website && <a href={q.supplier.website} target="_blank" rel="noreferrer" className="text-xs text-brand-blue">site</a>}{" "}
                          {q.productUrl && <a href={q.productUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-blue">produto</a>}
                        </td>
                        <td className={td}>{q.supplier.kind === "varejo" ? <Badge tone="amber" title="Anúncio de varejo: não é preço de atacado">varejo</Badge> : <Badge tone={q.supplier.country === "Brasil" ? "green" : "blue"}>{KIND_LABEL[q.supplier.kind] ?? q.supplier.kind}</Badge>}</td>
                        <td className={td}>{q.unitPrice === null ? <span className="text-amber-300">Sob consulta</span> : brl(q.unitPrice)}{q.tiers && <div className="text-[11px] text-mute">faixas: {q.tiers}</div>}</td>
                        <td className={td}>{q.moq ?? "—"}</td>
                        <td className={td}>{brl(q.shippingCost)}</td>
                        <td className={td}>{brl(landed)}</td>
                        <td className={td}>{q.leadTimeDays ? `${q.leadTimeDays} d` : "—"}</td>
                        <td className={`${td} font-medium ${r && r.contributionPct > 0 ? "text-green-400" : "text-red-400"}`}>{r ? `${pct(r.contributionPct)} (${brl(r.contributionMargin)})` : "—"}</td>
                        <td className={td}>{q.unitPrice === null ? "—" : brl(lot * q.unitPrice + (q.shippingCost ?? 0))}</td>
                        <td className={`${td} text-xs text-mute`}>{date(q.quoteDate)}<br />{q.channel}</td>
                        <td className={td}>
                          <div className="flex flex-col gap-1">
                            {q.unitPrice !== null && (chosen ? <Badge tone="green">escolhido</Badge> : (
                              <form action={chooseQuote}><input type="hidden" name="productId" value={a.product.id} /><input type="hidden" name="quoteId" value={q.id} /><input type="hidden" name="_back" value={backUrl} /><button className="text-xs text-brand-blue">escolher</button></form>
                            ))}
                            {r && <Link href={`/calculadora?p=${a.product.id}&q=${q.id}`} className="text-xs text-brand-blue">calcular</Link>}
                            <form action={deleteQuote}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="_back" value={backUrl} /><button className="text-xs text-mute hover:text-red-300">excluir</button></form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              </>
            )}
          </Card>

          <Card title="Registrar fornecedor / cotação" className="mt-6">
            <form action={createSupplierQuote} className="grid gap-3 md:grid-cols-4">
              <input type="hidden" name="productId" value={a.product.id} />
              <input type="hidden" name="_back" value={backUrl} />
              <Field label="Fornecedor">
                <select name="supplierId" className={input} defaultValue="__new">
                  <option value="__new">+ Novo fornecedor (preencha ao lado)</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Nome da empresa"><input name="name" className={input} /></Field>
              <Field label="Tipo">
                <select name="kind" className={input} defaultValue="atacadista">{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </Field>
              <Field label="País"><input name="country" defaultValue="Brasil" className={input} /></Field>
              <Field label="Cidade/UF"><input name="location" className={input} /></Field>
              <Field label="Site oficial"><input name="website" className={input} placeholder="https://" /></Field>
              <Field label="Contato público"><input name="contact" className={input} placeholder="telefone, e-mail, WhatsApp" /></Field>
              <Field label="Link do produto"><input name="productUrl" className={input} /></Field>
              <Field label="Preço unitário (R$)" hint="Em branco = Sob consulta"><input name="unitPrice" className={input} /></Field>
              <Field label="Compra mínima (un.)"><input name="moq" className={input} /></Field>
              <Field label="Descontos por quantidade" hint="ex.: 100:11,50;500:10,90"><input name="tiers" className={input} /></Field>
              <Field label="Frete do lote (R$)"><input name="shippingCost" className={input} /></Field>
              <Field label="Prazo de entrega (dias)"><input name="leadTimeDays" className={input} /></Field>
              <Field label="Disponibilidade"><input name="availability" className={input} /></Field>
              <Field label="Canal da cotação">
                <select name="channel" className={input}><option value="site">Site</option><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="presencial">Presencial</option></select>
              </Field>
              <Field label="Data da pesquisa/cotação"><input type="date" name="quoteDate" className={input} /></Field>
              <div className="md:col-span-3"><Field label="Observações"><input name="notes" className={input} /></Field></div>
              <div className="flex items-end"><button className={btnPrimary}>Salvar cotação</button></div>
            </form>
            <div className="mt-3"><Notice tone="amber">Anúncios de varejo (ex.: outro vendedor da Shopee/Mercado Livre) devem ser cadastrados como tipo “Varejo”: o sistema sinaliza que não é preço de atacado.</Notice></div>
          </Card>
        </>
      )}
    </>
  );
}
