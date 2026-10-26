import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Field, input, btnPrimary } from "./ui";

export function SignUpForm({ invite, email, withCompany = true }: { invite?: string; email?: string; withCompany?: boolean }) {
  return (
    <form action={signUp} className="space-y-4">
      {invite && <input type="hidden" name="invite" value={invite} />}
      <Field label="Seu nome"><input name="name" required autoComplete="name" className={input} /></Field>
      <Field label="E-mail"><input type="email" name="email" required defaultValue={email} readOnly={!!email} autoComplete="email" className={input} /></Field>
      {withCompany && <Field label="Nome da loja ou empresa" hint="opcional"><input name="company" className={input} /></Field>}
      <Field label="Senha" hint="mínimo de 8 caracteres, com letras e números"><input type="password" name="password" required autoComplete="new-password" className={input} /></Field>
      <label className="flex items-start gap-2 text-xs text-mute">
        <input type="checkbox" name="terms" required className="mt-0.5" />
        <span>Li e aceito os <Link href="/termos" target="_blank" className="text-brand-blue">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="text-brand-blue">Política de Privacidade</Link>.</span>
      </label>
      <button className={`${btnPrimary} w-full`}>Criar conta</button>
    </form>
  );
}
