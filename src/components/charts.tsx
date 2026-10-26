"use client";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Cell, AreaChart, Area, ReferenceLine } from "recharts";

const axis = { stroke: "#8b97b3", fontSize: 11 };
const tip = { contentStyle: { background: "#111830", border: "1px solid #24304f", borderRadius: 8, fontSize: 12 }, labelStyle: { color: "#e6ebf5" } };

export function SalesPriceChart({ data }: { data: { date: string; vendas: number | null; preco: number | null }[] }) {
  const has = data.some((d) => d.vendas !== null || d.preco !== null);
  if (!has) return <div className="grid h-64 place-items-center text-sm text-mute">Sem histórico suficiente para o gráfico.</div>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#24304f" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={axis} tickFormatter={(v: string) => v.slice(5).split("-").reverse().join("/")} minTickGap={24} />
        <YAxis yAxisId="v" tick={axis} width={40} />
        <YAxis yAxisId="p" orientation="right" tick={axis} width={50} tickFormatter={(v: number) => `R$${v.toFixed(0)}`} />
        <Tooltip {...tip} formatter={(v: number, n: string) => (n === "Preço mediano" ? `R$ ${v?.toFixed(2)}` : v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="v" dataKey="vendas" name="Vendas/dia (derivadas)" fill="#22c55e" opacity={0.75} radius={[3, 3, 0, 0]} />
        <Line yAxisId="p" dataKey="preco" name="Preço mediano" stroke="#3b82f6" dot={false} strokeWidth={2} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GrowthBars({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <div className="grid h-48 place-items-center text-sm text-mute">Sem produtos com crescimento calculável.</div>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid stroke="#24304f" strokeDasharray="3 3" />
        <XAxis type="number" tick={axis} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
        <YAxis type="category" dataKey="name" tick={axis} width={200} />
        <Tooltip {...tip} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
        <Bar dataKey="value" name="Crescimento" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? "#22c55e" : "#ef4444"} />
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
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#24304f" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={axis} tickFormatter={(v: number) => `d${v}`} minTickGap={30} />
        <YAxis tick={axis} width={70} tickFormatter={(v: number) => `R$${Math.round(v)}`} />
        <Tooltip {...tip} labelFormatter={(v) => `Dia ${v}`} formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Caixa acumulado"]} />
        <ReferenceLine y={0} stroke="#8b97b3" />
        <Area dataKey="caixa" stroke="#22c55e" fill="url(#cash)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({ data, money }: { data: { name: string; value: number }[]; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid stroke="#24304f" strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={axis} />
        <YAxis tick={axis} width={60} tickFormatter={(v: number) => (money ? `R$${v.toFixed(0)}` : String(v))} />
        <Tooltip {...tip} formatter={(v: number) => (money ? `R$ ${v.toFixed(2)}` : v)} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? "#06b6d4" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
