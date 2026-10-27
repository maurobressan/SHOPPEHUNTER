import Link from "next/link";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/auth";
import { signIn } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { Field, input, btnPrimary } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";

export const metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/painel";
  if (await getCtx()) redirect(next);
  return (
    <AuthCard title="Entrar" subtitle={<>Não tem conta? <Link className="text-brand-blue" href="/cadastro">Criar conta grátis</Link></>}>
      <Flash sp={sp} />
      <form action={signIn} className="space-y-4">
        {typeof sp.next === "string" && <input type="hidden" name="_back" value={sp.next} />}
        <Field label="E-mail"><input type="email" name="email" required autoComplete="email" className={input} /></Field>
        <Field label="Senha"><input type="password" name="password" required autoComplete="current-password" className={input} /></Field>
        <button className={`${btnPrimary} w-full`}>Entrar</button>
      </form>
      <Link href="/recuperar-senha" className="mt-4 block text-center text-sm text-mute hover:text-ink">Esqueci minha senha</Link>
    </AuthCard>
  );
}
