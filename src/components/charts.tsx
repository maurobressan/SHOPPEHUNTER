"use client";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Cell, AreaChart, Area, ReferenceLine } from "recharts";

const axis = { stroke: "rgb(var(--mute))", fill: "rgb(var(--mute))", fontSize: 11 };
const tip = { contentStyle: { background: "rgb(var(--panel))", border: "1px solid rgb(var(--line))", borderRadius: 12, fontSize: 12, boxShadow: "0 10px 30px -12px rgb(15 27 61 / 0.25)" }, labelStyle: { color: "rgb(var(--ink))", fontWeight: 600 }, itemStyle: { color: "rgb(var(--ink))" } };

export function SalesPriceChart({ data }: { data: { date: string; vendas: number | null; preco: number | null }[] }) {
  const has = data.some((d) => d.vendas !== null || d.preco !== null);
  if (!has) return <div className="grid h-64 place-items-center text-sm text-mute">Sem histórico suficiente para o gráfico.</div>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={axis} tickFormatter={(v: string) => v.slice(5).split("-").reverse().join("/")} minTickGap={24} />
        <YAxis yAxisId="v" tick={axis} width={40} />
        <YAxis yAxisId="p" orientation="right" tick={axis} width={50} tickFormatter={(v: number) => `R$${v.toFixed(0)}`} />
        <Tooltip {...tip} formatter={(v: number, n: string) => (n === "Preço mediano" ? `R$ ${v?.toFixed(2)}` : v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="v" dataKey="vendas" name="Vendas/dia (derivadas)" fill="rgb(var(--brand-green))" opacity={0.75} radius={[3, 3, 0, 0]} />
        <Line yAxisId="p" dataKey="preco" name="Preço mediano" stroke="rgb(var(--brand-blue))" dot={false} strokeWidth={2} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GrowthBars({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <div className="grid h-48 place-items-center text-sm text-mute">Sem produtos com crescimento calculável.</div>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" />
        <XAxis type="number" tick={axis} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
        <YAxis type="category" dataKey="name" tick={axis} width={200} />
        <Tooltip {...tip} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
        <Bar dataKey="value" name="Crescimento" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? "rgb(var(--brand-green))" : "rgb(var(--bad))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CashChart({ data }: { data: { day: number; caixa: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand-green))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="rgb(var(--brand-green))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={axis} tickFormatter={(v: number) => `d${v}`} minTickGap={30} />
        <YAxis tick={axis} width={70} tickFormatter={(v: number) => `R$${Math.round(v)}`} />
        <Tooltip {...tip} labelFormatter={(v) => `Dia ${v}`} formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Caixa acumulado"]} />
        <ReferenceLine y={0} stroke="rgb(var(--mute))" />
        <Area dataKey="caixa" stroke="rgb(var(--brand-green))" fill="url(#cash)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({ data, money }: { data: { name: string; value: number }[]; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={axis} />
        <YAxis tick={axis} width={60} tickFormatter={(v: number) => (money ? `R$${v.toFixed(0)}` : String(v))} />
        <Tooltip {...tip} formatter={(v: number) => (money ? `R$ ${v.toFixed(2)}` : v)} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? "rgb(var(--brand-cyan))" : "rgb(var(--bad))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
