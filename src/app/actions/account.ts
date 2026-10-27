"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCtx, requireManager, requirePlatformAdmin, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword, newToken, sha256, passwordProblem, normalizeEmail, validEmail } from "@/lib/crypto";
import { sendEmail, appUrl } from "@/lib/email";
import { createCheckout, createPortal, billingConfigured } from "@/lib/billing";
import { affiliateConfig } from "@/lib/sources/shopee-affiliate";
import { collectSearch } from "@/lib/collector";
import { limitReached } from "@/lib/usage";
import { s, n, back } from "@/lib/form";

// ---------- Perfil e conta ----------
export async function updateProfile(f: FormData) {
  const ctx = await requireCtx();
  const name = s(f, "name");
  if (name.length < 2) back("/conta", "erro", "Informe seu nome.");
  await prisma.user.update({ where: { id: ctx.user.id }, data: { name } });
  if (ctx.role !== "member" && s(f, "accountName")) await prisma.account.update({ where: { id: ctx.accountId }, data: { name: s(f, "accountName") } });
  revalidatePath("/", "layout");
  back("/conta", "ok", "Dados atualizados.");
}

export async function changePassword(f: FormData) {
  const ctx = await requireCtx();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } });
  if (!(await verifyPassword(s(f, "current"), user.passwordHash))) back("/conta", "erro", "Senha atual incorreta.");
  const pw = s(f, "password");
  const err = passwordProblem(pw);
  if (err) back("/conta", "erro", err);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(pw) } });
  await prisma.session.deleteMany({ where: { userId: user.id, id: { not: ctx.sessionId } } });
  back("/conta", "ok", "Senha alterada. As outras sessões foram encerradas.");
}

// ---------- Equipe ----------
export async function inviteMember(f: FormData) {
  const ctx = await requireManager();
  const email = normalizeEmail(s(f, "email"));
  const role = s(f, "role") === "admin" ? "admin" : "member";
  if (!validEmail(email)) back("/conta", "erro", "E-mail inválido.");
  const lim = await limitReached(ctx, "members");
  if (lim) back("/conta", "erro", lim);
  if (await prisma.membership.findFirst({ where: { accountId: ctx.accountId, user: { email } } })) back("/conta", "erro", "Este e-mail já faz parte da conta.");
  const token = newToken();
  await prisma.invite.create({ data: { accountId: ctx.accountId, email, role, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 7 * 86400000) } });
  const link = `${appUrl()}/convite/${token}`;
  const sent = await sendEmail(email, `Convite para ${ctx.accountName} — Shoppe Hunter`, `<p>${ctx.user.name} convidou você para a conta <b>${ctx.accountName}</b>.</p><p><a href="${link}">Aceitar convite</a> (válido por 7 dias)</p>`);
  revalidatePath("/conta");
  back("/conta", "ok", sent ? `Convite enviado para ${email}.` : `Convite criado. Envie este link para ${email} (válido por 7 dias): ${link}`);
}

export async function revokeInvite(f: FormData) {
  const ctx = await requireManager();
  await prisma.invite.deleteMany({ where: { id: s(f, "id"), accountId: ctx.accountId } });
  revalidatePath("/conta");
  back("/conta", "ok", "Convite cancelado.");
}

export async function removeMember(f: FormData) {
  const ctx = await requireManager();
  const m = await prisma.membership.findFirst({ where: { id: s(f, "id"), accountId: ctx.accountId } });
  if (!m) back("/conta", "erro", "Membro não encontrado.");
  if (m!.role === "owner") back("/conta", "erro", "O dono da conta não pode ser removido.");
  await prisma.membership.delete({ where: { id: m!.id } });
  await prisma.session.deleteMany({ where: { userId: m!.userId, accountId: ctx.accountId } });
  revalidatePath("/conta");
  back("/conta", "ok", "Membro removido.");
}

// ---------- Tokens da extensão ----------
// O token volta só para a tela que pediu (nunca no endereço da página, que fica no histórico
// do navegador e em registros). Ele aparece uma única vez: guardamos só o hash.
export async function createApiToken(_prev: { token?: string; error?: string }, f: FormData): Promise<{ token?: string; error?: string }> {
  const ctx = await requireCtx();
  if (!ctx.limits.extension) return { error: "A extensão não está incluída no seu plano." };
  const token = `shp_${newToken(24)}`;
  await prisma.apiToken.create({ data: { accountId: ctx.accountId, name: (s(f, "name") || "Extensão do navegador").slice(0, 100), prefix: token.slice(0, 10), tokenHash: sha256(token) } });
  revalidatePath("/conta");
  return { token };
}

// Conexão automática da extensão: gera um token e devolve para a página, que o entrega à
// extensão instalada. O token anterior desta mesma conexão (mesmo usuário) é substituído.
export async function connectExtension(): Promise<{ token?: string; error?: string }> {
  const ctx = await requireCtx();
  if (!ctx.limits.extension) return { error: "A extensão não está incluída no seu plano. Veja os planos em Assinatura." };
  const name = `Chrome de ${ctx.user.name.split(" ")[0]} (conexão automática)`.slice(0, 100);
  const token = `shp_${newToken(24)}`;
  await prisma.$transaction([
    prisma.apiToken.deleteMany({ where: { accountId: ctx.accountId, name } }),
    prisma.apiToken.create({ data: { accountId: ctx.accountId, name, prefix: token.slice(0, 10), tokenHash: sha256(token) } }),
  ]);
  revalidatePath("/conta");
  return { token };
}

export async function revokeApiToken(f: FormData) {
  const ctx = await requireCtx();
  await prisma.apiToken.deleteMany({ where: { id: s(f, "id"), accountId: ctx.accountId } });
  revalidatePath("/conta");
  back("/conta", "ok", "Token revogado.");
}

// ---------- LGPD ----------
export async function deleteAccount(f: FormData) {
  const ctx = await requireCtx();
  if (ctx.role !== "owner") back("/conta", "erro", "Apenas o dono pode excluir a conta.");
  if (s(f, "confirm") !== ctx.accountName) back("/conta", "erro", "Digite o nome exato da conta para confirmar.");
  if (ctx.subscription?.provider === "stripe" && ctx.subscription.status === "active") back("/conta", "erro", "Cancele a assinatura em Assinatura → Gerenciar pagamento antes de excluir a conta.");
  await prisma.account.delete({ where: { id: ctx.accountId } });
  // remove usuários que ficaram sem nenhuma conta
  const orphan = await prisma.user.findUnique({ where: { id: ctx.user.id }, include: { memberships: true } });
  if (orphan && !orphan.memberships.length) await prisma.user.delete({ where: { id: orphan.id } });
  await destroySession();
  redirect("/?ok=" + encodeURIComponent("Conta e dados excluídos."));
}

// ---------- Assinatura ----------
export async function startCheckout(f: FormData) {
  const ctx = await requireManager();
  if (!billingConfigured()) back("/assinatura", "erro", "Pagamento online ainda não está ativo. Fale com o suporte.");
  let url: string;
  try {
    url = await createCheckout(ctx.accountId, s(f, "planId"), ctx.user.email);
  } catch (e) {
    return back("/assinatura", "erro", e instanceof Error ? e.message : "Erro ao iniciar pagamento.");
  }
  redirect(url);
}

export async function openPortal() {
  const ctx = await requireManager();
  let url: string;
  try {
    url = await createPortal(ctx.accountId);
  } catch (e) {
    return back("/assinatura", "erro", e instanceof Error ? e.message : "Erro ao abrir o portal.");
  }
  redirect(url);
}

// ---------- Administração da plataforma ----------
export async function adminSetPlan(f: FormData) {
  await requirePlatformAdmin();
  const accountId = s(f, "accountId");
  const planId = s(f, "planId");
  const status = s(f, "status") || "active";
  const days = n(f, "days");
  if (!(await prisma.plan.findUnique({ where: { id: planId } }))) back("/admin", "erro", "Plano inválido.");
  await prisma.subscription.upsert({
    where: { accountId },
    create: { accountId, planId, status, provider: "manual", currentPeriodEnd: days ? new Date(Date.now() + days * 86400000) : null },
    update: { planId, status, ...(days ? { currentPeriodEnd: new Date(Date.now() + days * 86400000) } : {}), ...(status === "trialing" && days ? { trialEndsAt: new Date(Date.now() + days * 86400000) } : {}) },
  });
  revalidatePath("/admin");
  back("/admin", "ok", "Assinatura atualizada.");
}

const planSchema = z.object({
  name: z.string().min(2),
  description: z.string(),
  priceCents: z.number().int().min(0),
  stripePriceId: z.string(),
  limits: z.object({
    products: z.number().int(),
    aiReports: z.number().int(),
    members: z.number().int(),
    imports: z.number().int(),
    autoCollect: z.boolean(),
    extension: z.boolean(),
    alerts: z.boolean(),
    aiExternal: z.boolean(),
  }),
});

export async function adminSavePlan(f: FormData) {
  await requirePlatformAdmin();
  const id = s(f, "id");
  const int = (k: string) => Math.round(n(f, k) ?? 0);
  const parsed = planSchema.safeParse({
    name: s(f, "name"),
    description: s(f, "description"),
    priceCents: Math.round((n(f, "price") ?? 0) * 100),
    stripePriceId: s(f, "stripePriceId"),
    limits: { products: int("products"), aiReports: int("aiReports"), members: int("members"), imports: int("imports"), autoCollect: f.get("autoCollect") === "on", extension: f.get("extension") === "on", alerts: f.get("alerts") === "on", aiExternal: f.get("aiExternal") === "on" },
  });
  if (!parsed.success) return back("/admin", "erro", "Plano inválido: " + parsed.error.issues.map((i) => i.path.join(".")).join(", "));
  const d = parsed.data;
  await prisma.plan.update({ where: { id }, data: { name: d.name, description: d.description, priceCents: d.priceCents, stripePriceId: d.stripePriceId || null, limits: JSON.stringify(d.limits), active: f.get("active") === "on", highlighted: f.get("highlighted") === "on" } });
  revalidatePath("/", "layout");
  back("/admin", "ok", `Plano ${d.name} salvo.`);
}

const rulesSchema = z.object({
  bands: z.array(z.object({ min: z.number().min(0), pct: z.number().min(0).max(1), fixed: z.number().min(0), pixSubsidyPct: z.number().optional() })).min(1),
  lowPrice: z.object({ below: z.number().positive(), fixedFractionOfPrice: z.number().min(0).max(1) }).optional(),
  cpfSurcharge: z.object({ amount: z.number().min(0), ordersThreshold: z.number(), periodDays: z.number(), regressiveBelow: z.number().optional() }).optional(),
});

export async function addFeeSchedule(f: FormData) {
  await requirePlatformAdmin();
  let rules: unknown;
  try {
    rules = JSON.parse(s(f, "rules"));
  } catch {
    return back("/admin", "erro", "Regras: JSON inválido.");
  }
  const parsed = rulesSchema.safeParse(rules);
  if (!parsed.success) return back("/admin", "erro", `Regras inválidas: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  if (parsed.data.bands[0].min !== 0 || parsed.data.bands.some((b, i) => i > 0 && b.min <= parsed.data.bands[i - 1].min)) back("/admin", "erro", "As faixas devem começar em 0 e estar em ordem crescente.");
  const vf = s(f, "validFrom");
  const url = s(f, "sourceUrl");
  if (!vf || !/^https?:\/\//.test(url)) back("/admin", "erro", "Informe a data de vigência e o link da fonte oficial.");
  const sellerType = s(f, "sellerType") === "CPF" ? "CPF" : "CNPJ";
  const validFrom = new Date(`${vf}T00:00:00-03:00`);
  await prisma.feeSchedule.updateMany({ where: { sellerType, validTo: null, validFrom: { lt: validFrom } }, data: { validTo: new Date(validFrom.getTime() - 1000) } });
  await prisma.feeSchedule.create({ data: { name: s(f, "name") || `Shopee BR ${sellerType} — ${vf}`, sellerType, validFrom, sourceUrl: url, sourceTitle: s(f, "sourceTitle"), notes: s(f, "notes"), rules: JSON.stringify(parsed.data) } });
  revalidatePath("/", "layout");
  back("/admin", "ok", "Nova versão da tabela de comissão cadastrada para todos os clientes.");
}

export async function testAffiliate() {
  const ctx = await requirePlatformAdmin();
  if (!affiliateConfig()) back("/admin", "erro", "AppID/Secret não configurados no arquivo .env do servidor.");
  const r = await collectSearch(ctx.accountId, { keyword: "garrafa termica", sortType: 2, limit: 5 });
  back("/admin", r.ok ? "ok" : "erro", `Teste da API de Afiliados: ${r.message}`);
}
