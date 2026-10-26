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
    <div className="grid items-start gap-5 md:grid-cols-3">
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
          <div
            key={p.id}
            className={`relative flex flex-col rounded-3xl border bg-panel p-6 shadow-card ${p.highlighted ? "border-brand-blue/50 shadow-lift ring-1 ring-brand-blue/30 md:-mt-3 md:pb-9" : "border-line"} ${current === p.id ? "ring-2 ring-ok" : ""}`}
          >
            {p.highlighted && (
              <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[#1565ff] to-[#18c8e8] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">mais escolhido</div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-ink">{p.name}</div>
              {current === p.id && <span className="rounded-full bg-ok/10 px-2.5 py-0.5 text-xs font-bold text-ok">seu plano</span>}
            </div>
            <div className="mt-1 min-h-[2.5rem] text-sm text-mute">{p.description}</div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight text-ink">{p.price}</span>
              <span className="text-sm font-medium text-mute">/mês</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {features.map(([ok, label]) => (
                <li key={label} className={`flex gap-2.5 ${ok ? "text-ink/90" : "text-mute/60"}`}>
                  {ok ? (
                    <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-ok/15 text-ok"><Check size={12} strokeWidth={3} /></span>
                  ) : (
                    <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-panel2"><X size={11} strokeWidth={3} /></span>
                  )}
                  <span className={ok ? "" : "line-through"}>{label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">{action(p.id)}</div>
          </div>
        );
      })}
    </div>
  );
}
