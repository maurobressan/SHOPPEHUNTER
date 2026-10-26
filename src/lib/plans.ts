// Planos e limites. Os valores ficam na tabela Plan (editáveis no painel Admin);
// estes são os padrões criados na primeira execução. -1 = ilimitado.
export interface PlanLimits {
  products: number; // produtos monitorados ativos
  aiReports: number; // relatórios do assistente por mês
  members: number; // usuários na conta
  imports: number; // importações de planilha por mês
  autoCollect: boolean; // coleta automática diária pela API
  extension: boolean; // extensão "Salvar no Hunter"
  alerts: boolean;
  aiExternal: boolean; // usar IA externa (além do relatório por regras)
}

export const DEFAULT_PLANS: { id: string; name: string; description: string; priceCents: number; highlighted?: boolean; sort: number; limits: PlanLimits }[] = [
  {
    id: "gratis",
    name: "Grátis",
    description: "Para conhecer e validar os primeiros produtos.",
    priceCents: 0,
    sort: 0,
    limits: { products: 3, aiReports: 3, members: 1, imports: 2, autoCollect: false, extension: true, alerts: false, aiExternal: false },
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para quem testa produtos todo mês.",
    priceCents: 4990,
    highlighted: true,
    sort: 1,
    limits: { products: 50, aiReports: 60, members: 2, imports: -1, autoCollect: true, extension: true, alerts: true, aiExternal: true },
  },
  {
    id: "business",
    name: "Business",
    description: "Para equipes e operações com muitos SKUs.",
    priceCents: 9990,
    sort: 2,
    limits: { products: 300, aiReports: -1, members: 10, imports: -1, autoCollect: true, extension: true, alerts: true, aiExternal: true },
  },
];

export const FREE_PLAN_ID = "gratis";
export const TRIAL_PLAN_ID = "pro";
export const trialDays = () => Number(process.env.TRIAL_DAYS ?? 7);

export function parseLimits(json: string): PlanLimits {
  const base = DEFAULT_PLANS[0].limits;
  try {
    return { ...base, ...(JSON.parse(json) as Partial<PlanLimits>) };
  } catch {
    return base;
  }
}

export const withinLimit = (used: number, limit: number) => limit < 0 || used < limit;

export interface SubLike {
  status: string;
  planId: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

// Plano efetivo: assinatura ativa, teste vigente ou período já pago; senão, Grátis.
export function effectivePlanId(sub: SubLike | null, now = new Date()): string {
  if (!sub) return FREE_PLAN_ID;
  if (sub.status === "active") return sub.planId;
  if (sub.status === "trialing" && sub.trialEndsAt && sub.trialEndsAt > now) return sub.planId;
  // inadimplente ou cancelado: mantém acesso até o fim do período pago, com 3 dias de tolerância
  if ((sub.status === "past_due" || sub.status === "canceled") && sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() + 3 * 86400000 > now.getTime()) return sub.planId;
  return FREE_PLAN_ID;
}

export const priceLabel = (cents: number) => (cents === 0 ? "R$ 0" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
