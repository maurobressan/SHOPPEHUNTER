import Link from "next/link";
import type { ReactNode } from "react";
import type { TrendClass } from "@/lib/trends";
import { TREND_LABELS } from "@/lib/trends";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-mute">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-line bg-panel p-5 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-mute">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "green" | "blue" | "red" | "amber" }) {
  const c = { default: "text-ink", green: "text-brand-green", blue: "text-brand-blue", red: "text-red-400", amber: "text-amber-400" }[tone];
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="text-xs uppercase tracking-wide text-mute">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${c}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default", title }: { children: ReactNode; tone?: "default" | "green" | "blue" | "red" | "amber" | "violet"; title?: string }) {
  const c = {
    default: "bg-panel2 text-mute border-line",
    green: "bg-green-500/10 text-green-400 border-green-500/30",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    red: "bg-red-500/10 text-red-400 border-red-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  }[tone];
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${c}`}>
      {children}
    </span>
  );
}

export const TREND_TONE: Record<TrendClass, "green" | "blue" | "default" | "amber" | "red" | "violet"> = {
  explosivo: "violet",
  crescimento: "green",
  estavel: "blue",
  saturado: "amber",
  queda: "red",
  insuficiente: "default",
};

export function TrendBadge({ c }: { c: TrendClass }) {
  return <Badge tone={TREND_TONE[c]}>{TREND_LABELS[c].replace("Produto ", "")}</Badge>;
}

export function RecBadge({ rec, confirmed }: { rec: string; confirmed: boolean }) {
  const tone = rec === "Comprar para testar" ? "green" : rec === "Evitar no momento" ? "red" : "amber";
  return (
    <Badge tone={tone} title={confirmed ? "" : "Dados insuficientes: oportunidade não confirmada"}>
      {rec}
      {!confirmed && " *"}
    </Badge>
  );
}

export function DemoTag({ show }: { show: boolean }) {
  return show ? <Badge tone="amber">DEMO</Badge> : null;
}

export function EstTag({ observed, confidence }: { observed: boolean; confidence: number }) {
  return observed ? null : (
    <Badge tone="amber" title={`Extrapolado de cobertura parcial dos snapshots. Confiança ${(confidence * 100).toFixed(0)}%`}>
      estimativa {(confidence * 100).toFixed(0)}%
    </Badge>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel/50 p-8 text-center">
      <div className="font-medium text-ink">{title}</div>
      {children && <div className="mx-auto mt-2 max-w-xl text-sm text-mute">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "blue", children }: { tone?: "blue" | "amber" | "red" | "green"; children: ReactNode }) {
  const c = {
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    red: "border-red-500/30 bg-red-500/10 text-red-200",
    green: "border-green-500/30 bg-green-500/10 text-green-200",
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${c}`}>{children}</div>;
}

export const btn = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50";
export const btnPrimary = `${btn} bg-gradient-to-r from-brand-green to-brand-cyan text-slate-950 hover:brightness-110`;
export const btnGhost = `${btn} border border-line bg-panel2 text-ink hover:border-brand-blue/60`;
export const btnDanger = `${btn} border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20`;
export const input = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-mute/60 focus:border-brand-blue focus:outline-none";
export const label = "mb-1 block text-xs font-medium text-mute";

export function Field({ label: l, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={label}>{l}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mute/80">{hint}</span>}
    </label>
  );
}

export function PeriodTabs({ base, current, extra = "" }: { base: string; current: number; extra?: string }) {
  return (
    <div className="flex rounded-lg border border-line bg-panel p-1">
      {[7, 15, 30, 60, 90].map((d) => (
        <Link
          key={d}
          href={`${base}?periodo=${d}${extra}`}
          className={`rounded-md px-3 py-1 text-sm ${d === current ? "bg-brand-blue/20 text-brand-blue" : "text-mute hover:text-ink"}`}
        >
          {d}d
        </Link>
      ))}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead className="bg-panel2 text-left text-xs uppercase tracking-wide text-mute">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-3 py-2.5 align-top";
