import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseLimits, priceLabel, trialDays } from "@/lib/plans";
import { PlanCards } from "@/components/PlanCards";
import { Flash, type SP } from "@/components/Flash";
import { btnPrimary, btnGhost } from "@/components/ui";
import { Calculator, Radar, Swords, Truck, FileSpreadsheet, MousePointerClick, Bell, Wallet, ShieldCheck } from "lucide-react";

const FEATURES = [
  { icon: Calculator, title: "Lucro real por venda", text: "Tarifas oficiais da Shopee por faixa de preço, cupons, impostos do seu regime, frete e embalagem. Descubra o preço mínimo para lucrar R$ X ou ter Y% de margem." },
  { icon: Radar, title: "Radar de tendências", text: "Histórico próprio de vendas e preços, crescimento em 7 e 30 dias, aceleração e classificação transparente: explosivo, crescendo, estável, saturado ou em queda." },
  { icon: Swords, title: "Raio-X da concorrência", text: "Faixa de preços, mediana, concentração de vendas, pontuação de saturação explicada e oportunidades de diferenciação e kits." },
  { icon: Truck, title: "Fornecedores e cotações", text: "Pesquise atacadistas nacionais, registre cotações de WhatsApp e e-mail e compare custo com frete, compra mínima e margem." },
  { icon: Wallet, title: "Fluxo de caixa do lote", text: "Quanto dinheiro fica empatado no estoque, em quantos dias ele volta considerando o repasse da Shopee e qual o lucro do lote." },
  { icon: MousePointerClick, title: "Extensão Salvar no Hunter", text: "Navegando na Shopee, veja tarifas e margem do anúncio na hora e salve concorrentes com um clique." },
  { icon: Bell, title: "Alertas automáticos", text: "Aviso quando um concorrente derruba o preço, quando entra concorrente novo ou quando sua margem fica abaixo do mínimo." },
  { icon: FileSpreadsheet, title: "Suas vendas, de verdade", text: "Importe a planilha do Centro do Vendedor e veja faturamento, taxas, cancelamentos, devoluções e lucro por SKU em 7, 30 e 90 dias." },
  { icon: ShieldCheck, title: "Sem número inventado", text: "Toda estimativa vem marcada, com método e nível de confiança. Sem dados suficientes, a recomendação não é confirmada." },
];

const FAQ = [
  ["Os dados de vendas dos concorrentes são reais?", "A Shopee só mostra as vendas acumuladas de cada anúncio. O Hunter registra esse número todo dia e calcula as vendas de cada período pela diferença. Quando ainda não há histórico suficiente, mostramos que é estimativa e com que confiança."],
  ["Preciso dar a senha da minha loja?", "Não. Suas vendas entram pela planilha que você exporta do Centro do Vendedor. A extensão só lê a página que você está vendo."],
  ["As taxas estão atualizadas?", "Usamos a política de comissão oficial da Shopee Brasil, versionada por data de vigência e com link para a fonte. Quando a Shopee muda as regras, atualizamos a tabela."],
  ["Posso cancelar quando quiser?", "Sim. O cancelamento é feito na própria área de assinatura e você mantém o acesso até o fim do período pago."],
];

export default async function Landing({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
  const days = trialDays();
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <Flash sp={sp} />
        <div className="mx-auto mb-5 w-fit rounded-full border border-brand-green/40 bg-brand-green/10 px-3 py-1 text-xs text-brand-green">Taxas da Shopee de outubro/2026 já incluídas</div>
        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Descubra o que vale a pena vender na <span className="bg-gradient-to-r from-brand-green to-brand-cyan bg-clip-text text-transparent">Shopee</span> antes de comprar o estoque
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-mute">
          Tendências, concorrência, fornecedores e o lucro real de cada venda em um só lugar. Decisões com base em dados e custos de verdade, não em achismo.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/cadastro" className={`${btnPrimary} px-6 py-3 text-base`}>{days > 0 ? `Testar ${days} dias grátis` : "Criar conta grátis"}</Link>
          <Link href="/precos" className={`${btnGhost} px-6 py-3 text-base`}>Ver planos</Link>
        </div>
        <p className="mt-3 text-xs text-mute">Sem cartão para começar.</p>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-semibold text-ink sm:text-3xl">Tudo o que você precisa para escolher o próximo produto</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-line bg-panel p-5">
              <Icon className="text-brand-green" />
              <div className="mt-3 font-semibold text-ink">{title}</div>
              <p className="mt-1 text-sm text-mute">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-semibold text-ink sm:text-3xl">Como funciona</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-4">
          {["Encontre ou salve produtos e concorrentes", "Acompanhe vendas, preços e saturação", "Compare fornecedores e calcule o lucro real", "Receba a recomendação: testar, monitorar ou evitar"].map((t, i) => (
            <li key={t} className="rounded-xl border border-line bg-panel p-5">
              <div className="text-3xl font-bold text-brand-blue">{i + 1}</div>
              <div className="mt-2 text-sm text-ink">{t}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-semibold text-ink sm:text-3xl">Planos</h2>
        <PlanCards
          plans={plans.map((p) => ({ id: p.id, name: p.name, description: p.description, price: priceLabel(p.priceCents), limits: parseLimits(p.limits), highlighted: p.highlighted }))}
          action={() => <Link href="/cadastro" className={`${btnPrimary} w-full`}>Começar</Link>}
        />
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-semibold text-ink">Perguntas frequentes</h2>
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-line bg-panel p-4">
              <summary className="cursor-pointer font-medium text-ink">{q}</summary>
              <p className="mt-2 text-sm text-mute">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
