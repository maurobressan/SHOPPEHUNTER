"use client";
import { Notice, btnGhost } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <Notice tone="red">
        Ocorreu um erro ao processar esta página. {error.message && !error.message.includes("digest") ? error.message : "Verifique os dados informados e tente novamente."}
      </Notice>
      <button onClick={reset} className={btnGhost}>Tentar novamente</button>
    </div>
  );
}
