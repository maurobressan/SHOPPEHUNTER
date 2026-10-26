import Link from "next/link";
import { requestReset } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { Field, input, btnPrimary } from "@/components/ui";
import { Flash, type SP } from "@/components/Flash";

export const metadata = { title: "Recuperar senha" };

export default async function Recuperar({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return (
    <AuthCard title="Recuperar senha" subtitle="Enviaremos um link para criar uma nova senha.">
      <Flash sp={sp} />
      <form action={requestReset} className="space-y-4">
        <Field label="E-mail da conta"><input type="email" name="email" required className={input} /></Field>
        <button className={`${btnPrimary} w-full`}>Enviar link</button>
      </form>
      <Link href="/login" className="mt-4 block text-center text-sm text-mute hover:text-ink">Voltar ao login</Link>
    </AuthCard>
  );
}
