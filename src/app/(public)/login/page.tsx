import Link from "next/link";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/auth";
import { signIn } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { Field, input, btnPrimary } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";

export const metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<SP> }) {
  if (await getCtx()) redirect("/painel");
  const sp = await searchParams;
  return (
    <AuthCard title="Entrar" subtitle={<>Não tem conta? <Link className="text-brand-blue" href="/cadastro">Criar conta grátis</Link></>}>
      <Flash sp={sp} />
      <form action={signIn} className="space-y-4">
        <Field label="E-mail"><input type="email" name="email" required autoComplete="email" className={input} /></Field>
        <Field label="Senha"><input type="password" name="password" required autoComplete="current-password" className={input} /></Field>
        <button className={`${btnPrimary} w-full`}>Entrar</button>
      </form>
      <Link href="/recuperar-senha" className="mt-4 block text-center text-sm text-mute hover:text-ink">Esqueci minha senha</Link>
    </AuthCard>
  );
}
