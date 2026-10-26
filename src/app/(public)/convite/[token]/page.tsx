import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCtx } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";
import { acceptInviteLoggedIn } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { SignUpForm } from "@/components/SignUpForm";
import { btnPrimary } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";

export const metadata = { title: "Convite" };

export default async function Convite({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<SP> }) {
  const { token } = await params;
  const sp = await searchParams;
  const inv = await prisma.invite.findUnique({ where: { tokenHash: sha256(token) }, include: { account: { select: { name: true } } } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date())
    return <AuthCard title="Convite inválido" subtitle="Este convite expirou ou já foi usado. Peça um novo ao responsável pela conta." >{null}</AuthCard>;
  const ctx = await getCtx();
  const existing = await prisma.user.findUnique({ where: { email: inv.email }, select: { id: true } });
  return (
    <AuthCard title={`Entrar na equipe ${inv.account.name}`} subtitle={`Convite para ${inv.email}`}>
      <Flash sp={sp} />
      {ctx ? (
        ctx.user.email === inv.email ? (
          <form action={acceptInviteLoggedIn}><input type="hidden" name="invite" value={token} /><button className={`${btnPrimary} w-full`}>Aceitar convite</button></form>
        ) : (
          <p className="text-sm text-mute">Você está logado como {ctx.user.email}. Saia e entre com {inv.email} para aceitar.</p>
        )
      ) : existing ? (
        <p className="text-sm text-mute">Você já tem conta. <Link className="text-brand-blue" href="/login">Entre com {inv.email}</Link> e abra este link de novo para aceitar.</p>
      ) : (
        <SignUpForm invite={token} email={inv.email} withCompany={false} />
      )}
    </AuthCard>
  );
}
