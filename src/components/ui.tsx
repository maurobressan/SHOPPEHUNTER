import Link from "next/link";
import type { ReactNode } from "react";
import type { TrendClass } from "@/lib/trends";
import { TREND_LABELS } from "@/lib/trends";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.65rem] font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-mute">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-panel p-5 shadow-card sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-bold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = "default" | "green" | "blue" | "red" | "amber" | "violet";

const TONE_TEXT: Record<Tone, string> = { default: "text-ink", green: "text-ok", blue: "text-info", red: "text-bad", amber: "text-warn", violet: "text-accent" };
const TONE_BAR: Record<Tone, string> = { default: "bg-line", green: "bg-ok", blue: "bg-info", red: "bg-bad", amber: "bg-warn", violet: "bg-accent" };

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Exclude<Tone, "violet"> }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel p-4 shadow-card sm:p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${TONE_BAR[tone]}`} />
      <div className="text-[13px] font-medium text-mute">{label}</div>
      <div className={`mt-1.5 text-[1.7rem] font-bold leading-tight tracking-tight ${TONE_TEXT[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default", title }: { children: ReactNode; tone?: Tone; title?: string }) {
  const c = {
    default: "bg-panel2 text-mute",
    green: "bg-ok/10 text-ok",
    blue: "bg-info/10 text-info",
    red: "bg-bad/10 text-bad",
    amber: "bg-warn/10 text-warn",
    violet: "bg-accent/10 text-accent",
  }[tone];
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>
      {children}
    </span>
  );
}

export const TREND_TONE: Record<TrendClass, Tone> = {
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
    <div className="rounded-2xl border border-dashed border-line bg-panel2/40 p-8 text-center">
      <div className="font-semibold text-ink">{title}</div>
      {children && <div className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-mute">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "blue", children }: { tone?: "blue" | "amber" | "red" | "green"; children: ReactNode }) {
  const c = {
    blue: "border-info/25 bg-info/[0.07] text-ink [&_b]:text-info",
    amber: "border-warn/30 bg-warn/[0.08] text-ink [&_b]:text-warn",
    red: "border-bad/30 bg-bad/[0.07] text-bad",
    green: "border-ok/30 bg-ok/[0.08] text-ok",
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${c}`}>{children}</div>;
}

export const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 disabled:opacity-50";
export const btnPrimary = `${btn} bg-brand-blue text-white shadow-sm shadow-brand-blue/30 hover:bg-brand-blue/90`;
export const btnGhost = `${btn} border border-line bg-panel text-ink hover:border-brand-blue/40 hover:bg-panel2`;
export const btnDanger = `${btn} border border-bad/30 bg-bad/[0.06] text-bad hover:bg-bad/10`;
export const input = "w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink shadow-sm placeholder:text-mute/60 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15";
export const label = "mb-1.5 block text-[13px] font-semibold text-ink/80";

export function Field({ label: l, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={label}>{l}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function PeriodTabs({ base, current, extra = "" }: { base: string; current: number; extra?: string }) {
  return (
    <div className="flex rounded-xl border border-line bg-panel p-1 shadow-sm">
      {[7, 15, 30, 60, 90].map((d) => (
        <Link
          key={d}
          href={`${base}?periodo=${d}${extra}`}
          className={`rounded-lg px-3 py-1 text-sm font-medium transition ${d === current ? "bg-brand-blue text-white shadow-sm" : "text-mute hover:bg-panel2 hover:text-ink"}`}
        >
          {d}d
        </Link>
      ))}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-panel2 text-left text-xs font-semibold text-mute">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line [&>tr:hover]:bg-panel2/50">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-3 py-2.5 align-top";
