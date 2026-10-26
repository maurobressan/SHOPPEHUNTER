import Link from "next/link";
import { prisma } from "@/lib/db";
import { scope } from "@/lib/settings";
import { requireCtx } from "@/lib/auth";
import { usage } from "@/lib/usage";
import { createProduct } from "@/app/actions/app";
import { Card, PageHeader, Table, td, Empty, Field, input, btnPrimary, Badge, DemoTag } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";
import { date, dateTime } from "@/lib/format";

const STATUS_TONE: Record<string, "blue" | "green" | "amber" | "default"> = { monitorando: "blue", testando: "amber", vendendo: "green", descartado: "default" };

export default async function MeusProdutos({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  const u = await usage(ctx.accountId);
  const products = await prisma.product.findMany({
    where: await scope(ctx.accountId),
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { listings: true, quotes: true } }, listings: { select: { snapshots: { select: { collectedAt: true }, orderBy: { collectedAt: "desc" }, take: 1 } } } },
  });
  return (
    <>
      <PageHeader title="Meus Produtos" subtitle="Produtos que você acompanha. As palavras-chave são usadas na coleta diária pela API oficial.">
        <Badge tone={ctx.limits.products >= 0 && u.products >= ctx.limits.products ? "red" : "default"}>
          {u.products} / {ctx.limits.products < 0 ? "∞" : ctx.limits.products} produtos no plano {ctx.planName}
        </Badge>
      </PageHeader>
      <Flash sp={sp} />
      <Card title="Adicionar produto à lista">
        <form action={createProduct} className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2"><Field label="Nome do produto"><input name="name" required className={input} placeholder="ex.: Garrafa térmica inox 500 ml" /></Field></div>
          <div className="md:col-span-2"><Field label="Palavras-chave para coleta" hint="separe por vírgula"><input name="keywords" className={input} placeholder="garrafa termica 500ml, garrafa inox" /></Field></div>
          <Field label="Categoria"><input name="category" className={input} /></Field>
          <Field label="Preço-alvo de venda (R$)" hint="opcional"><input name="targetPrice" className={input} /></Field>
          <div className="md:col-span-6"><button className={btnPrimary}>Salvar produto</button></div>
        </form>
      </Card>
      <div className="mt-6">
        {products.length === 0 ? (
          <Empty title="Sua lista está vazia">Adicione um produto acima ou salve anúncios a partir de Explorar Produtos.</Empty>
        ) : (
          <Table head={["Produto", "Status", "Categoria", "Palavras-chave", "Anúncios", "Cotações", "Última coleta", "Criado"]}>
            {products.map((p) => {
              const last = p.listings.flatMap((l) => l.snapshots.map((s) => s.collectedAt)).sort((a, b) => b.getTime() - a.getTime())[0];
              return (
                <tr key={p.id} className="hover:bg-panel2/40">
                  <td className={td}><Link href={`/produtos/${p.id}`} className="font-medium hover:text-brand-blue">{p.name}</Link> <DemoTag show={p.isDemo} /></td>
                  <td className={td}><Badge tone={STATUS_TONE[p.status] ?? "default"}>{p.status}</Badge></td>
                  <td className={td}>{p.category || "—"}</td>
                  <td className={`${td} max-w-xs text-xs text-mute`}>{p.keywords || "—"}</td>
                  <td className={td}>{p._count.listings}</td>
                  <td className={td}>{p._count.quotes}</td>
                  <td className={td}>{dateTime(last)}</td>
                  <td className={td}>{date(p.createdAt)}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}
