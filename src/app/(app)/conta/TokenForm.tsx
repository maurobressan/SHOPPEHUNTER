"use client";
import { useActionState, useState } from "react";
import { createApiToken } from "@/app/actions/account";
import { Field, Notice, btnPrimary, btnGhost, input } from "@/components/ui";

export function TokenForm() {
  const [state, action, pending] = useActionState(createApiToken, {});
  const [copied, setCopied] = useState(false);
  return (
    <>
      {state.token && (
        <div className="mt-3">
          <Notice tone="green">
            Token criado. Copie agora: por segurança ele não será exibido de novo.
            <code className="mt-2 block break-all rounded-lg bg-panel p-2 text-sm text-ink">{state.token}</code>
            <button
              type="button"
              className={`${btnGhost} mt-2 py-1 text-xs`}
              onClick={() => navigator.clipboard?.writeText(state.token!).then(() => setCopied(true))}
            >
              {copied ? "Copiado ✓" : "Copiar"}
            </button>
          </Notice>
        </div>
      )}
      {state.error && <div className="mt-3"><Notice tone="red">{state.error}</Notice></div>}
      <form action={action} className="mt-3 flex items-end gap-2">
        <Field label="Nome do token"><input name="name" placeholder="Chrome do escritório" className={input} /></Field>
        <button className={btnPrimary} disabled={pending}>Gerar token</button>
      </form>
    </>
  );
}
