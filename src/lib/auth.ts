// Autenticação por sessão (cookie httpOnly) e contexto da conta ativa.
// Toda página/ação do app chama requireCtx(): é a fronteira de isolamento entre clientes.
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { newToken, sha256 } from "./crypto";
import { effectivePlanId, parseLimits, trialDays, TRIAL_PLAN_ID, type PlanLimits } from "./plans";

export const SESSION_COOKIE = "shp_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string, accountId: string) {
  const token = newToken();
  const ua = (await headers()).get("user-agent") ?? "";
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, accountId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000), userAgent: ua.slice(0, 200) } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.APP_URL?.startsWith("http://"),
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export interface Ctx {
  user: { id: string; email: string; name: string; isAdmin: boolean };
  accountId: string;
  accountName: string;
  role: "owner" | "admin" | "member";
  planId: string;
  planName: string;
  limits: PlanLimits;
  subscription: { status: string; planId: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null; provider: string; cancelAtPeriodEnd: boolean; providerCustomerId: string | null } | null;
  sessionId: string;
}

export const getCtx = cache(async (): Promise<Ctx | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_accountId: { userId: session.userId, accountId: session.accountId } },
    include: { account: { include: { subscription: true } } },
  });
  if (!membership) return null;
  const sub = membership.account.subscription;
  const planId = effectivePlanId(sub);
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  return {
    user: { id: session.user.id, email: session.user.email, name: session.user.name, isAdmin: session.user.isAdmin },
    accountId: membership.accountId,
    accountName: membership.account.name,
    role: membership.role as Ctx["role"],
    planId,
    planName: plan?.name ?? planId,
    limits: parseLimits(plan?.limits ?? "{}"),
    subscription: sub,
    sessionId: session.id,
  };
});

export async function requireCtx(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireManager(): Promise<Ctx> {
  const ctx = await requireCtx();
  if (ctx.role === "member") redirect("/conta?erro=" + encodeURIComponent("Apenas o dono ou administradores da conta podem fazer isso."));
  return ctx;
}

export async function requirePlatformAdmin(): Promise<Ctx> {
  const ctx = await requireCtx();
  if (!ctx.user.isAdmin) redirect("/painel");
  return ctx;
}

// Cria conta + usuário dono + teste grátis do plano Pro.
export async function createAccountForUser(userId: string, accountName: string) {
  const account = await prisma.account.create({ data: { name: accountName, memberships: { create: { userId, role: "owner" } } } });
  const days = trialDays();
  await prisma.subscription.create({
    data: {
      accountId: account.id,
      planId: days > 0 ? TRIAL_PLAN_ID : "gratis",
      status: days > 0 ? "trialing" : "active",
      trialEndsAt: days > 0 ? new Date(Date.now() + days * 86400000) : null,
    },
  });
  return account;
}

// Limitador simples de tentativas (memória do processo). Em produção com várias instâncias, troque por Redis.
const attempts = new Map<string, { n: number; until: number }>();
export function tooManyAttempts(key: string, max = 8, windowMs = 15 * 60000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) {
    attempts.set(key, { n: 1, until: now + windowMs });
    return false;
  }
  a.n++;
  return a.n > max;
}
export const clearAttempts = (key: string) => attempts.delete(key);

// Autenticação por token de API (extensão do navegador).
export async function ctxFromApiToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const t = await prisma.apiToken.findUnique({ where: { tokenHash: sha256(token) }, include: { account: { include: { subscription: true } } } });
  if (!t) return null;
  await prisma.apiToken.update({ where: { id: t.id }, data: { lastUsedAt: new Date() } });
  const planId = effectivePlanId(t.account.subscription);
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  return { accountId: t.accountId, planId, limits: parseLimits(plan?.limits ?? "{}") };
}
