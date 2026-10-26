export const brl = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const pct = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;

export const signedPct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${pct(n)}`);

export const int = (n: number | null | undefined) => (n === null || n === undefined ? "—" : Math.round(n).toLocaleString("pt-BR"));

export const date = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export const dateTime = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export const PERIODS = [7, 15, 30, 60, 90] as const;

export function periodParam(v: string | string[] | undefined, def = 30): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return (PERIODS as readonly number[]).includes(n) ? n : def;
}

export const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
