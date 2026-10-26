import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import type { PlanLimits } from "@/lib/plans";

const lim = (n: number, unit: string) => (n < 0 ? `${unit} ilimitados` : `${n} ${unit}`);

export function PlanCards({
  plans,
  current,
  action,
}: {
  plans: { id: string; name: string; description: string; price: string; limits: PlanLimits; highlighted: boolean }[];
  current?: string;
  action: (id: string) => ReactNode;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {plans.map((p) => {
        const features: [boolean, string][] = [
          [true, lim(p.limits.products, "produtos monitorados")],
          [true, lim(p.limits.aiReports, "relatórios de análise/mês")],
          [true, "Calculadora com taxas oficiais, kits, cenários e fluxo de caixa"],
          [true, "Importação de vendas da sua loja" + (p.limits.imports >= 0 ? ` (${p.limits.imports}/mês)` : "")],
          [p.limits.extension, "Extensão Salvar no Hunter"],
          [p.limits.autoCollect, "Coleta automática diária (API oficial)"],
          [p.limits.alerts, "Alertas de preço, concorrentes e margem"],
          [p.limits.aiExternal, "Análise com IA"],
          [true, lim(p.limits.members, "usuários")],
        ];
        return (
          <div key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.highlighted ? "border-brand-green/60 bg-gradient-to-b from-brand-green/10 to-panel shadow-lg shadow-brand-green/10" : "border-line bg-panel"} ${current === p.id ? "ring-2 ring-brand-blue" : ""}`}>
            {p.highlighted && <div className="mb-2 w-fit rounded-full bg-brand-green/20 px-2 py-0.5 text-[11px] font-semibold text-brand-green">mais escolhido</div>}
            <div className="text-lg font-semibold text-ink">{p.name}</div>
            <div className="mt-1 text-sm text-mute">{p.description}</div>
            <div className="mt-4 text-3xl font-bold text-ink">{p.price}<span className="text-sm font-normal text-mute">/mês</span></div>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {features.map(([ok, label]) => (
                <li key={label} className={`flex gap-2 ${ok ? "text-ink/90" : "text-mute/60 line-through"}`}>
                  {ok ? <Check size={16} className="mt-0.5 shrink-0 text-brand-green" /> : <X size={16} className="mt-0.5 shrink-0" />}
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-6">{action(p.id)}</div>
          </div>
        );
      })}
    </div>
  );
}
