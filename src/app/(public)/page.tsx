import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { parseLimits, priceLabel, trialDays } from "@/lib/plans";
import { computeFees, SHOPEE_BR_2026_10 } from "@/lib/fees";
import { brl } from "@/lib/format";
import { PlanCards } from "@/components/PlanCards";
import { Flash, type SP } from "@/components/Flash";
import { btnPrimary, btnGhost } from "@/components/ui";
import { Calculator, Radar, Swords, Truck, FileSpreadsheet, MousePointerClick, Bell, Wallet, ShieldCheck, Check, ArrowRight, BadgeCheck, Lock, Eye } from "lucide-react";

const FEATURES = [
  { icon: Calculator, color: "from-[#1565ff] to-[#3b82f6]", title: "Lucro real por venda", text: "Tarifas oficiais da Shopee por faixa de preço, cupons, impostos do seu regime, frete e embalagem. Descubra o preço mínimo para lucrar R$ X ou ter Y% de margem." },
  { icon: Radar, color: "from-[#0aa5c8] to-[#18c8e8]", title: "Radar de tendências", text: "Histórico próprio de vendas e preços, crescimento em 7 e 30 dias e classificação transparente: explosivo, crescendo, estável, saturado ou em queda." },
  { icon: Swords, color: "from-[#7c3aed] to-[#a78bfa]", title: "Raio-X da concorrência", text: "Faixa de preços, mediana, concentração de vendas, saturação explicada e oportunidades de diferenciação e kits." },
  { icon: Truck, color: "from-[#16a050] to-[#3ddc84]", title: "Fornecedores e cotações", text: "Registre cotações de WhatsApp e e-mail e compare custo com frete, compra mínima e margem." },
  { icon: Wallet, color: "from-[#0b1e4f] to-[#1565ff]", title: "Fluxo de caixa do lote", text: "Quanto dinheiro fica parado no estoque, em quantos dias ele volta com o repasse da Shopee e qual o lucro do lote." },
  { icon: MousePointerClick, color: "from-[#0aa5c8] to-[#3ddc84]", title: "Extensão Salvar no Hunter", text: "Navegando na Shopee, veja tarifas e margem do anúncio na hora e salve concorrentes com um clique." },
  { icon: Bell, color: "from-[#e8590c] to-[#f59f00]", title: "Alertas automáticos", text: "Aviso quando um concorrente derruba o preço, quando entra concorrente novo ou quando sua margem fica abaixo do mínimo." },
  { icon: FileSpreadsheet, color: "from-[#16a050] to-[#22c55e]", title: "Suas vendas, de verdade", text: "Importe a planilha do Centro do Vendedor e veja faturamento, taxas, devoluções e lucro por SKU." },
  { icon: ShieldCheck, color: "from-[#1565ff] to-[#18c8e8]", title: "Sem número inventado", text: "Toda estimativa vem marcada, com método e nível de confiança. Sem dados suficientes, a recomendação não é confirmada." },
];

const STEPS = [
  ["Encontre", "Pesquise ou salve produtos e concorrentes enquanto navega na Shopee."],
  ["Acompanhe", "O Hunter registra vendas e preços todo dia e mostra a tendência."],
  ["Calcule", "Compare fornecedores e veja o lucro real com as taxas oficiais."],
  ["Decida", "Receba a recomendação: testar, monitorar ou evitar — com o motivo."],
];

const FAQ = [
  ["Os dados de vendas dos concorrentes são reais?", "A Shopee só mostra as vendas acumuladas de cada anúncio. O Hunter registra esse número todo dia e calcula as vendas de cada período pela diferença. Quando ainda não há histórico suficiente, mostramos que é estimativa e com que confiança."],
  ["Preciso dar a senha da minha loja?", "Não. Suas vendas entram pela planilha que você exporta do Centro do Vendedor. A extensão só lê a página que você está vendo."],
  ["As taxas estão atualizadas?", "Usamos a política de comissão oficial da Shopee Brasil, versionada por data de vigência e com link para a fonte. Quando a Shopee muda as regras, atualizamos a tabela."],
  ["Posso cancelar quando quiser?", "Sim. O cancelamento é feito na própria área de assinatura e você mantém o acesso até o fim do período pago."],
];

// Exemplo do cartão do topo, calculado com as regras oficiais (não é um número fixo).
const EX_PRICE = 59.9;
const EX_COST = 22;

export default async function Landing({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
  const days = trialDays();
  const fee = computeFees(EX_PRICE, SHOPEE_BR_2026_10);
  const received = EX_PRICE - fee.total;
  const cta = days > 0 ? `Testar ${days} dias grátis` : "Criar conta grátis";

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_85%_0%,rgba(24,200,232,0.16),transparent_60%),radial-gradient(800px_400px_at_0%_20%,rgba(21,101,255,0.10),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
          <div>
            <Flash sp={sp} />
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ok/25 bg-ok/[0.08] px-3 py-1 text-xs font-semibold text-ok">
              <BadgeCheck size={14} /> Taxas oficiais da Shopee de outubro/2026
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-brand-navy sm:text-[3.4rem]">
              Descubra o que vale a pena vender na Shopee <span className="brand-gradient-text">antes de comprar o estoque</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-mute">
              Tendências, concorrência, fornecedores e o lucro real de cada venda em um só lugar. Decisões com dados e custos de verdade, não com achismo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cadastro" className={`${btnPrimary} px-6 py-3 text-base`}>{cta} <ArrowRight size={18} /></Link>
              <Link href="/precos" className={`${btnGhost} px-6 py-3 text-base`}>Ver planos</Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-mute">
              <li className="flex items-center gap-1.5"><Check size={16} className="text-ok" /> Sem cartão para começar</li>
              <li className="flex items-center gap-1.5"><Lock size={15} className="text-ok" /> Não pedimos a senha da loja</li>
              <li className="flex items-center gap-1.5"><Eye size={15} className="text-ok" /> Estimativas sempre marcadas</li>
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#1565ff]/15 via-[#18c8e8]/10 to-[#3ddc84]/15 blur-2xl" />
            <div className="relative rounded-3xl border border-line bg-white p-6 shadow-lift">
              <div className="flex items-center gap-3">
                <Image src="/brand/icon.png" alt="" width={44} height={44} />
                <div>
                  <div className="text-sm font-bold text-brand-navy">Calculadora de lucro</div>
                  <div className="text-xs text-mute">Exemplo com a tabela vigente</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-panel2 p-3">
                  <div className="text-xs text-mute">Preço de venda</div>
                  <div className="text-lg font-bold">{brl(EX_PRICE)}</div>
                </div>
                <div className="rounded-2xl bg-panel2 p-3">
                  <div className="text-xs text-mute">Custo do produto</div>
                  <div className="text-lg font-bold">{brl(EX_COST)}</div>
                </div>
              </div>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-mute">Comissão ({(fee.pct * 100).toFixed(0)}%)</dt><dd className="font-semibold text-bad">− {brl(fee.commission)}</dd></div>
                <div className="flex justify-between"><dt className="text-mute">Tarifa fixa por item</dt><dd className="font-semibold text-bad">− {brl(fee.fixed)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2.5"><dt className="text-mute">Você recebe da Shopee</dt><dd className="font-semibold">{brl(received)}</dd></div>
              </dl>
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#16a050] to-[#22c55e] p-4 text-white">
                <div className="text-xs font-medium text-white/85">Sobra por venda, antes de imposto e embalagem</div>
                <div className="text-3xl font-extrabold">{brl(received - EX_COST)}</div>
              </div>
              <p className="mt-3 text-[11px] leading-snug text-mute">No sistema você inclui imposto, embalagem, frete, cupons e anúncios para ver o lucro líquido.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-sm font-bold uppercase tracking-[0.12em] text-brand-blue">Recursos</div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">Tudo para escolher o próximo produto</h2>
            <p className="mt-3 text-mute">Do primeiro palpite até a compra do lote, cada passo com números que você pode conferir.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, title, text }) => (
              <div key={title} className="rounded-2xl border border-line bg-bg/60 p-6 transition hover:-translate-y-0.5 hover:border-brand-blue/30 hover:bg-white hover:shadow-lift">
                <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
                  <Icon size={21} />
                </div>
                <div className="mt-4 font-bold text-brand-navy">{title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-mute">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-sm font-bold uppercase tracking-[0.12em] text-brand-blue">Como funciona</div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">Quatro passos, sem planilha bagunçada</h2>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="relative rounded-2xl border border-line bg-white p-6 shadow-card">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-navy font-brand text-lg font-black text-white">{i + 1}</div>
                <div className="mt-4 text-lg font-bold text-brand-navy">{t}</div>
                <p className="mt-1 text-sm leading-relaxed text-mute">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <div className="text-sm font-bold uppercase tracking-[0.12em] text-brand-blue">Planos</div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">Comece grátis, assine quando fizer sentido</h2>
          </div>
          <PlanCards
            plans={plans.map((p) => ({ id: p.id, name: p.name, description: p.description, price: priceLabel(p.priceCents), limits: parseLimits(p.limits), highlighted: p.highlighted }))}
            action={(id) => <Link href="/cadastro" className={`${plans.find((p) => p.id === id)?.highlighted ? btnPrimary : btnGhost} w-full py-2.5`}>Começar</Link>}
          />
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 text-center text-3xl font-extrabold tracking-tight text-brand-navy">Perguntas frequentes</h2>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-line bg-white p-5 shadow-card open:border-brand-blue/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-brand-navy">
                  {q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-panel2 text-brand-blue transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-mute">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand-navy px-6 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_80%_0%,rgba(24,200,232,0.35),transparent_60%),radial-gradient(500px_300px_at_10%_100%,rgba(61,220,132,0.25),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pare de comprar estoque no escuro</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/75">Crie sua conta e analise seu primeiro produto em poucos minutos.</p>
            <Link href="/cadastro" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-brand-navy shadow-lg transition hover:bg-white/90">
              {cta} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
