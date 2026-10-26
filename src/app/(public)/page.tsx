import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { parseLimits, priceLabel, trialDays } from "@/lib/plans";
import { computeFees, SHOPEE_BR_2026_10 } from "@/lib/fees";
import { brl } from "@/lib/format";
import { PlanCards } from "@/components/PlanCards";
import { Flash, type SP } from "@/components/Flash";
import { btnPrimary, btnGhost } from "@/components/ui";
import { DashboardMock, TrendMock, SalesMock, CalcMock } from "@/components/landing/Mockups";
import { Calculator, Radar, Swords, Truck, FileSpreadsheet, MousePointerClick, Bell, Wallet, ShieldCheck, Check, ArrowRight, BadgeCheck, Lock, Eye, Package, LineChart } from "lucide-react";

// Fotos do Unsplash (licença gratuita, uso comercial permitido).
const photo = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;
const PHOTOS = {
  seller: "1770013413878-2530e2c3d82b", // vendedora conferindo pedido no celular, com caixas
  packing: "1648747067192-790595bc6d5e", // embalando pedidos
  laptop: "1758874573562-5bf0c1a7fc72", // vendedor no notebook
  team: "1758873271761-6cfe9b4f000c", // equipe analisando gráficos
  owner: "1765650113564-86c52264262b", // empreendedora com notebook
};

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

// Cartão flutuante do topo, calculado com as regras oficiais (não é um número fixo).
const EX_PRICE = 59.9;
const EX_COST = 22;

const Eyebrow = ({ children, light }: { children: React.ReactNode; light?: boolean }) => (
  <div className={`text-sm font-bold uppercase tracking-[0.14em] ${light ? "text-[#5fe0f5]" : "text-brand-blue"}`}>{children}</div>
);

export default async function Landing({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
  const days = trialDays();
  const fee = computeFees(EX_PRICE, SHOPEE_BR_2026_10);
  const leftover = EX_PRICE - fee.total - EX_COST;
  const cta = days > 0 ? `Testar ${days} dias grátis` : "Criar conta grátis";

  return (
    <>
      {/* TOPO — azul-marinho com brilho da marca */}
      <section className="relative overflow-hidden bg-[#0b1e4f] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_85%_10%,rgba(24,200,232,0.35),transparent_60%),radial-gradient(700px_420px_at_5%_90%,rgba(61,220,132,0.22),transparent_60%),radial-gradient(900px_600px_at_50%_120%,rgba(21,101,255,0.45),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-20">
          <div>
            <Flash sp={sp} />
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#3ddc84]/40 bg-[#3ddc84]/10 px-3 py-1 text-xs font-semibold text-[#7bf0ad]">
              <BadgeCheck size={14} /> Taxas oficiais da Shopee de outubro/2026
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-[3.3rem]">
              Descubra o que vale a pena vender na Shopee <span className="brand-gradient-text">antes de comprar o estoque</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              Tendências, concorrência, fornecedores e o lucro real de cada venda em um só lugar. Decisões com dados e custos de verdade, não com achismo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cadastro" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1565ff] to-[#18c8e8] px-6 py-3 text-base font-bold text-white shadow-lg shadow-[#1565ff]/40 transition hover:brightness-110">
                {cta} <ArrowRight size={18} />
              </Link>
              <Link href="#por-dentro" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10">
                Ver por dentro
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
              <li className="flex items-center gap-1.5"><Check size={16} className="text-[#3ddc84]" /> Sem cartão para começar</li>
              <li className="flex items-center gap-1.5"><Lock size={15} className="text-[#3ddc84]" /> Não pedimos a senha da loja</li>
              <li className="flex items-center gap-1.5"><Eye size={15} className="text-[#3ddc84]" /> Estimativas sempre marcadas</li>
            </ul>
          </div>

          <div className="relative">
            <DashboardMock />
            <div className="absolute -bottom-20 -left-4 hidden w-44 overflow-hidden rounded-2xl border-4 border-white shadow-2xl sm:block lg:-left-10">
              <Image src={photo(PHOTOS.seller, 400)} alt="Vendedora conferindo um pedido no celular ao lado de caixas" width={400} height={300} className="h-32 w-full object-cover" />
            </div>
            <div className="absolute -right-3 -top-6 rounded-2xl bg-white p-3 text-slate-800 shadow-2xl sm:-right-6">
              <div className="text-[11px] font-semibold text-slate-500">Sobra por venda de {brl(EX_PRICE)}*</div>
              <div className="text-2xl font-extrabold text-[#12894c]">{brl(leftover)}</div>
              <div className="text-[10px] text-slate-400">tarifa Shopee {brl(fee.total)} · custo {brl(EX_COST)}</div>
            </div>
          </div>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-6 text-[11px] text-white/45 sm:px-6">
          * Exemplo calculado com a tabela oficial vigente, antes de imposto e embalagem. Telas ilustrativas com dados de exemplo.
        </div>
      </section>

      {/* PARA QUEM VENDE — fotos de pessoas */}
      <section className="bg-gradient-to-b from-[#e3edff] to-[#eef6ff] py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative col-span-2 h-56 overflow-hidden rounded-3xl shadow-lift sm:h-64">
              <Image src={photo(PHOTOS.packing, 1100)} alt="Empreendedora embalando pedidos para envio" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-brand-navy shadow">
                <Package size={15} className="text-brand-blue" /> Compre o lote certo, na quantidade certa
              </div>
            </div>
            <div className="relative h-44 overflow-hidden rounded-3xl shadow-lift">
              <Image src={photo(PHOTOS.laptop, 600)} alt="Vendedor analisando produtos no notebook" fill sizes="280px" className="object-cover" />
            </div>
            <div className="relative h-44 overflow-hidden rounded-3xl shadow-lift">
              <Image src={photo(PHOTOS.team, 600)} alt="Equipe analisando gráficos de vendas" fill sizes="280px" className="object-cover" />
            </div>
          </div>
          <div>
            <Eyebrow>Feito para quem vende</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">Menos aposta, mais decisão</h2>
            <p className="mt-4 text-lg leading-relaxed text-mute">
              Seja você começando sozinho em casa ou tocando uma operação com equipe, o Hunter junta num só lugar o que hoje está espalhado em abas, prints e planilhas.
            </p>
            <ul className="mt-7 space-y-4">
              {[
                [LineChart, "Veja se o produto está subindo ou saturando", "Histórico diário de vendas e preços dos anúncios que você acompanha."],
                [Calculator, "Saiba o lucro antes de anunciar", "Comissão, tarifa fixa, imposto, frete e embalagem já descontados."],
                [FileSpreadsheet, "Entenda a sua própria loja", "Envie a planilha da Shopee e veja lucro por produto, devoluções e cancelamentos."],
              ].map(([I, t, d]) => {
                const Icon = I as typeof Check;
                return (
                  <li key={t as string} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-blue shadow-card"><Icon size={20} /></span>
                    <span>
                      <span className="block font-bold text-brand-navy">{t as string}</span>
                      <span className="block text-sm text-mute">{d as string}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* POR DENTRO — telas */}
      <section id="por-dentro" className="scroll-mt-20 bg-[#0b1e4f] py-20 text-white">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow light>Por dentro da plataforma</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Números claros, do jeito que você precisa ver</h2>
            <p className="mt-3 text-white/65">Painéis simples de ler: cor verde é oportunidade, vermelho é risco, e cada número explica de onde veio.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              [<TrendMock key="t" />, "Radar de tendências", "Quem está explodindo, crescendo ou saturando no seu nicho."],
              [<CalcMock key="c" />, "Calculadora de lucro", "Cada centavo que sai da venda, com a tabela oficial."],
              [<SalesMock key="s" />, "Suas vendas", "Faturamento e lucro a partir da planilha da sua loja."],
            ].map(([m, t, d]) => (
              <div key={t as string} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                {m}
                <div className="mt-4 px-1 font-bold">{t}</div>
                <div className="px-1 pb-1 text-sm text-white/60">{d}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-white/40">Telas ilustrativas com dados de exemplo.</p>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="scroll-mt-20 bg-gradient-to-b from-[#eaf8fc] to-[#e8f0ff] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Recursos</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">Tudo para escolher o próximo produto</h2>
            <p className="mt-3 text-mute">Do primeiro palpite até a compra do lote, cada passo com números que você pode conferir.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, title, text }) => (
              <div key={title} className="rounded-2xl border border-white bg-white/80 p-6 shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lift">
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

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="scroll-mt-20 bg-gradient-to-br from-[#1565ff] via-[#0f56d9] to-[#0aa5c8] py-20 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="relative h-72 overflow-hidden rounded-3xl shadow-2xl lg:h-[26rem]">
            <Image src={photo(PHOTOS.owner, 900)} alt="Empreendedora sorrindo com o notebook na mão" fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1e4f]/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-sm font-semibold">Do achismo para a decisão com dados em quatro passos.</div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.14em] text-white/80">Como funciona</div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Quatro passos, sem planilha bagunçada</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-white font-brand text-base font-black text-brand-blue">{i + 1}</div>
                  <div className="mt-3 text-lg font-bold">{t}</div>
                  <p className="mt-1 text-sm leading-relaxed text-white/80">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section className="bg-gradient-to-b from-[#eef6ff] to-[#e3edff] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Eyebrow>Planos</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">Comece grátis, assine quando fizer sentido</h2>
          </div>
          <PlanCards
            plans={plans.map((p) => ({ id: p.id, name: p.name, description: p.description, price: priceLabel(p.priceCents), limits: parseLimits(p.limits), highlighted: p.highlighted }))}
            action={(id) => <Link href="/cadastro" className={`${plans.find((p) => p.id === id)?.highlighted ? btnPrimary : btnGhost} w-full py-2.5`}>Começar</Link>}
          />
        </div>
      </section>

      {/* PERGUNTAS */}
      <section className="bg-[#e3edff] pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 text-center text-3xl font-extrabold tracking-tight text-brand-navy">Perguntas frequentes</h2>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-white bg-white p-5 shadow-card open:border-brand-blue/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-brand-navy">
                  {q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-blue/10 text-brand-blue transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-mute">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CHAMADA FINAL */}
      <section className="relative overflow-hidden bg-[#0b1e4f] text-white">
        <Image src={photo(PHOTOS.team, 1600)} alt="" fill sizes="100vw" className="object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1e4f] via-[#0b1e4f]/85 to-[#0b1e4f]/40" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Pare de comprar estoque no escuro</h2>
          <p className="mt-3 max-w-lg text-white/75">Crie sua conta e analise seu primeiro produto em poucos minutos.</p>
          <Link href="/cadastro" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1565ff] to-[#18c8e8] px-6 py-3 font-bold text-white shadow-lg shadow-[#1565ff]/40 transition hover:brightness-110">
            {cta} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
