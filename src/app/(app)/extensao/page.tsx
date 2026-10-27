import { requireCtx } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { Connect } from "./Connect";

export const metadata = { title: "Extensão do Chrome" };

export default async function Extensao() {
  const ctx = await requireCtx();
  // Link da Chrome Web Store, definido na Vercel depois que a extensão for aprovada.
  const installUrl = process.env.NEXT_PUBLIC_EXTENSION_URL || null;
  return (
    <>
      <PageHeader title="Extensão do Chrome" subtitle="Veja os vendidos dos concorrentes enquanto navega na Shopee e salve tudo no Hunter com um clique." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Connect allowed={ctx.limits.extension} installUrl={installUrl} />
        <Card title="O que ela faz">
          <ul className="space-y-3 text-sm text-mute">
            <li><b className="text-ink">Na busca, categoria ou loja:</b> selo com os vendidos em cada anúncio, resumo da página e botão para salvar todos como concorrentes.</li>
            <li><b className="text-ink">No anúncio:</b> tarifas, margem e quantas vendas ele fez desde o último registro salvo.</li>
            <li><b className="text-ink">Vendas do período:</b> “vendidos” é o total desde a criação do anúncio. Salve e volte em outros dias: o Hunter calcula as vendas da semana e do mês pela diferença.</li>
            <li><b className="text-ink">Privacidade:</b> lê só a página da Shopee que você está vendo. Não pede sua senha, não faz buscas sozinha e não acessa endereços internos da Shopee.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
