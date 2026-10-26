"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession, destroySession, createAccountForUser, tooManyAttempts, clearAttempts, requireCtx } from "@/lib/auth";
import { hashPassword, verifyPassword, newToken, sha256, passwordProblem, normalizeEmail, validEmail } from "@/lib/crypto";
import { sendEmail, appUrl, emailConfigured } from "@/lib/email";
import { s, back } from "@/lib/form";

async function ip() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

export async function signUp(f: FormData) {
  const name = s(f, "name");
  const email = normalizeEmail(s(f, "email"));
  const password = s(f, "password");
  const company = s(f, "company") || name;
  const invite = s(f, "invite");
  const path = invite ? `/convite/${invite}` : "/cadastro";
  if (name.length < 2) back(path, "erro", "Informe seu nome.");
  if (!validEmail(email)) back(path, "erro", "E-mail inválido.");
  const pwErr = passwordProblem(password);
  if (pwErr) back(path, "erro", pwErr);
  if (f.get("terms") !== "on") back(path, "erro", "É preciso aceitar os Termos de Uso e a Política de Privacidade.");
  if (tooManyAttempts(`signup:${await ip()}`, 10)) back(path, "erro", "Muitas tentativas. Aguarde alguns minutos.");
  if (await prisma.user.findUnique({ where: { email } })) back(path, "erro", "Já existe uma conta com este e-mail. Faça login.");
  const inv = invite ? await prisma.invite.findUnique({ where: { tokenHash: sha256(invite) } }) : null;
  if (invite && (!inv || inv.acceptedAt || inv.expiresAt < new Date() || normalizeEmail(inv.email) !== email)) back(path, "erro", "Convite inválido, expirado ou para outro e-mail.");
  const isFirst = (await prisma.user.count()) === 0; // o primeiro usuário é o administrador da plataforma
  const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), isAdmin: isFirst } });
  let accountId: string;
  if (inv) {
    await prisma.membership.create({ data: { userId: user.id, accountId: inv.accountId, role: inv.role } });
    await prisma.invite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
    accountId = inv.accountId;
  } else {
    accountId = (await createAccountForUser(user.id, company)).id;
  }
  await createSession(user.id, accountId);
  redirect("/painel?ok=" + encodeURIComponent(`Bem-vindo(a), ${name.split(" ")[0]}! Sua conta foi criada.`));
}

export async function signIn(f: FormData) {
  const email = normalizeEmail(s(f, "email"));
  const password = s(f, "password");
  const key = `login:${email}`;
  if (tooManyAttempts(key)) back("/login", "erro", "Muitas tentativas. Aguarde 15 minutos ou redefina sua senha.");
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: { orderBy: { createdAt: "asc" } } } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) back("/login", "erro", "E-mail ou senha incorretos.");
  if (!user!.memberships.length) back("/login", "erro", "Este usuário não pertence a nenhuma conta.");
  clearAttempts(key);
  await createSession(user!.id, user!.memberships[0].accountId);
  redirect("/painel");
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}

export async function switchAccount(f: FormData) {
  const ctx = await requireCtx();
  const accountId = s(f, "accountId");
  const m = await prisma.membership.findUnique({ where: { userId_accountId: { userId: ctx.user.id, accountId } } });
  if (!m) back("/conta", "erro", "Conta não encontrada.");
  await prisma.session.update({ where: { id: ctx.sessionId }, data: { accountId } });
  redirect("/painel");
}

export async function requestReset(f: FormData) {
  const email = normalizeEmail(s(f, "email"));
  if (tooManyAttempts(`reset:${await ip()}`, 5)) back("/recuperar-senha", "erro", "Muitas tentativas. Aguarde alguns minutos.");
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = newToken();
    await prisma.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600000) } });
    const link = `${appUrl()}/redefinir-senha/${token}`;
    const sent = await sendEmail(email, "Redefinir senha — Shoppe Hunter", `<p>Para criar uma nova senha, acesse: <a href="${link}">${link}</a></p><p>O link vale por 1 hora.</p>`);
    // Sem serviço de e-mail configurado (uso local), mostra o link na tela apenas fora de produção.
    if (!sent && !emailConfigured() && process.env.NODE_ENV !== "production") redirect(`/redefinir-senha/${token}`);
  }
  back("/recuperar-senha", "ok", "Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha.");
}

export async function resetPassword(f: FormData) {
  const token = s(f, "token");
  const password = s(f, "password");
  const path = `/redefinir-senha/${token}`;
  const pwErr = passwordProblem(password);
  if (pwErr) back(path, "erro", pwErr);
  const r = await prisma.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!r || r.usedAt || r.expiresAt < new Date()) back("/recuperar-senha", "erro", "Link inválido ou expirado. Solicite outro.");
  await prisma.user.update({ where: { id: r!.userId }, data: { passwordHash: await hashPassword(password) } });
  await prisma.passwordReset.update({ where: { id: r!.id }, data: { usedAt: new Date() } });
  await prisma.session.deleteMany({ where: { userId: r!.userId } });
  back("/login", "ok", "Senha alterada. Faça login com a nova senha.");
}

export async function acceptInviteLoggedIn(f: FormData) {
  const ctx = await requireCtx();
  const token = s(f, "invite");
  const inv = await prisma.invite.findUnique({ where: { tokenHash: sha256(token) } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date() || normalizeEmail(inv.email) !== ctx.user.email) back(`/convite/${token}`, "erro", "Convite inválido, expirado ou para outro e-mail.");
  await prisma.membership.upsert({
    where: { userId_accountId: { userId: ctx.user.id, accountId: inv!.accountId } },
    create: { userId: ctx.user.id, accountId: inv!.accountId, role: inv!.role },
    update: {},
  });
  await prisma.invite.update({ where: { id: inv!.id }, data: { acceptedAt: new Date() } });
  await prisma.session.update({ where: { id: ctx.sessionId }, data: { accountId: inv!.accountId } });
  redirect("/painel");
}
