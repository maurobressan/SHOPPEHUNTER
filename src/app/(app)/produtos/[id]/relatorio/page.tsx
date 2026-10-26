import { notFound } from "next/navigation";
import { requireCtx } from "@/lib/auth";
import { analyzeById } from "@/lib/analysis";
import { rulesReport } from "@/lib/ai-report";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";
import { periodParam } from "@/lib/format";
import type { SP } from "@/components/Flash";

export const metadata = { title: "Relatório do produto" };

export default async function Relatorio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const periodo = periodParam((await searchParams).periodo);
  const ctx = await requireCtx();
  const a = await analyzeById(ctx.accountId, id, periodo);
  if (!a) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-mute">Use “Imprimir” e escolha “Salvar como PDF” para gerar o arquivo.</p>
        <PrintButton />
      </div>
      <article className="rounded-xl border border-line bg-panel p-8 print:border-0 print:bg-white print:p-0 print:text-black">
        <div className="mb-4 text-xs text-mute print:text-gray-600">Shoppe Hunter · {ctx.accountName} · período de {periodo} dias</div>
        <Markdown text={rulesReport(a)} />
      </article>
    </div>
  );
}
