import { resetPassword } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { Field, input, btnPrimary } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";

export const metadata = { title: "Nova senha" };

export default async function Redefinir({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<SP> }) {
  const { token } = await params;
  const sp = await searchParams;
  return (
    <AuthCard title="Criar nova senha">
      <Flash sp={sp} />
      <form action={resetPassword} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="Nova senha" hint="mínimo de 8 caracteres, com letras e números"><input type="password" name="password" required autoComplete="new-password" className={input} /></Field>
        <button className={`${btnPrimary} w-full`}>Salvar nova senha</button>
      </form>
    </AuthCard>
  );
}
