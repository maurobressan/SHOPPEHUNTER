import Link from "next/link";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/auth";
import { trialDays } from "@/lib/plans";
import { AuthCard } from "@/components/AuthCard";
import { SignUpForm } from "@/components/SignUpForm";
import { Flash, type SP } from "@/components/Flash";

export const metadata = { title: "Criar conta" };

export default async function Cadastro({ searchParams }: { searchParams: Promise<SP> }) {
  if (await getCtx()) redirect("/painel");
  const sp = await searchParams;
  const days = trialDays();
  return (
    <AuthCard
      title="Criar conta"
      subtitle={<>{days > 0 ? `${days} dias do plano Pro grátis, sem cartão. ` : ""}Já tem conta? <Link className="text-brand-blue" href="/login">Entrar</Link></>}
    >
      <Flash sp={sp} />
      <SignUpForm />
    </AuthCard>
  );
}
