import { prisma } from "./db";
import { DEFAULT_WEIGHTS, type Weights } from "./hunter-score";
import { SHOPEE_BR_2026_10, type FeeRules } from "./fees";

export interface AppSettings {
  demoMode: boolean;
  sellerType: "CNPJ" | "CPF";
  cpfHighVolume: boolean;
  taxRegime: "nao_configurado" | "mei" | "simples" | "presumido" | "real" | "cpf";
  taxPct: number;
  packagingCost: number;
  shippingCost: number;
  adsPct: number;
  lossPct: number;
  otherVariableCost: number;
  fixedMonthly: number;
  testLotUnits: number;
  payoutDelayDays: number; // prazo médio de repasse da Shopee
  alertPriceDropPct: number; // alerta quando concorrente baixa o preço X%
  alertMinMarginPct: number; // alerta quando a margem estimada fica abaixo de X%
  weights: Weights;
  onboardingDismissed: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  demoMode: false,
  sellerType: "CNPJ",
  cpfHighVolume: false,
  taxRegime: "nao_configurado",
  taxPct: 0,
  packagingCost: 1.2,
  shippingCost: 0,
  adsPct: 0,
  lossPct: 2,
  otherVariableCost: 0,
  fixedMonthly: 0,
  testLotUnits: 30,
  payoutDelayDays: 15,
  alertPriceDropPct: 10,
  alertMinMarginPct: 10,
  weights: DEFAULT_WEIGHTS,
  onboardingDismissed: false,
};

export async function getSettings(accountId: string): Promise<AppSettings> {
  const row = await prisma.accountSetting.findUnique({ where: { accountId } });
  if (!row) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(row.value) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...v, weights: { ...DEFAULT_WEIGHTS, ...(v.weights ?? {}) } };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(accountId: string, patch: Partial<AppSettings>) {
  const next = { ...(await getSettings(accountId)), ...patch };
  const value = JSON.stringify(next);
  await prisma.accountSetting.upsert({ where: { accountId }, create: { accountId, value }, update: { value } });
  return next;
}

// Tabela vigente na data (global). Sem tabela no banco, usa a embutida (out/2026).
export async function getActiveFeeSchedule(sellerType: "CNPJ" | "CPF" = "CNPJ", date = new Date()) {
  const row = await prisma.feeSchedule.findFirst({
    where: { sellerType, validFrom: { lte: date }, OR: [{ validTo: null }, { validTo: { gte: date } }] },
    orderBy: { validFrom: "desc" },
  });
  if (!row) return { id: null as string | null, name: "Tabela embutida (out/2026)", rules: SHOPEE_BR_2026_10, sourceUrl: "https://seller.shopee.com.br/edu/article/26839", validFrom: new Date("2026-10-01") };
  return { id: row.id as string | null, name: row.name, rules: JSON.parse(row.rules) as FeeRules, sourceUrl: row.sourceUrl, validFrom: row.validFrom };
}

// Escopo de consultas: sempre a conta; fora do modo DEMO, somente dados reais.
export async function scope(accountId: string) {
  const s = await getSettings(accountId);
  return s.demoMode ? { accountId } : { accountId, isDemo: false };
}
