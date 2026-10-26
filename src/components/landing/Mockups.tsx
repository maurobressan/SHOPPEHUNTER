// Ilustrações das telas do sistema para a página inicial.
// Os números são de exemplo e a página avisa isso logo abaixo de cada ilustração.
import Image from "next/image";
import { LayoutDashboard, Search, Radar, Calculator, FileSpreadsheet, Bell, TrendingUp } from "lucide-react";

const Frame = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <div className="overflow-hidden rounded-2xl border border-white/15 bg-white shadow-[0_30px_80px_-20px_rgba(4,12,40,0.6)]">
    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      <span className="ml-3 truncate rounded-md bg-white px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-slate-200">{url}</span>
    </div>
    {children}
  </div>
);

const area = (pts: number[], w: number, h: number) => {
  const max = Math.max(...pts), min = Math.min(...pts);
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * w, h - ((p - min) / (max - min || 1)) * (h - 6) - 3]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return { line, fill: `${line} L${w},${h} L0,${h} Z` };
};

const Pill = ({ c, children }: { c: string; children: React.ReactNode }) => <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${c}`}>{children}</span>;

export function DashboardMock() {
  const a = area([12, 14, 13, 18, 17, 22, 21, 26, 30, 29, 35, 41], 300, 80);
  return (
    <Frame url="shoppehunter.vercel.app/painel">
      <div className="flex text-slate-800">
        <div className="hidden w-28 shrink-0 flex-col gap-1 bg-[#0b1e4f] p-2 sm:flex">
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <Image src="/brand/icon.png" alt="" width={18} height={18} />
            <span className="font-brand text-[10px] font-black text-white">Shoppe<span className="text-[#5fe0f5]">Hunter</span></span>
          </div>
          {[[LayoutDashboard, "Visão geral", true], [Search, "Explorar"], [Radar, "Tendências"], [Calculator, "Calculadora"], [FileSpreadsheet, "Vendas"], [Bell, "Alertas"]].map(([I, l, on]) => {
            const Icon = I as typeof Bell;
            return (
              <div key={l as string} className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[9px] ${on ? "bg-white/15 text-white" : "text-white/55"}`}>
                <Icon size={10} /> {l as string}
              </div>
            );
          })}
        </div>
        <div className="min-w-0 flex-1 bg-[#eef3fb] p-3">
          <div className="mb-2 text-[11px] font-bold">Visão geral · últimos 30 dias</div>
          <div className="grid grid-cols-3 gap-2">
            {[["Monitorados", "24", "border-l-slate-300"], ["Comprar p/ testar", "6", "border-l-[#16a050]"], ["Em alta", "9", "border-l-[#1565ff]"]].map(([l, v, c]) => (
              <div key={l} className={`rounded-lg border-l-[3px] bg-white p-2 shadow-sm ${c}`}>
                <div className="text-[8px] text-slate-500">{l}</div>
                <div className="text-base font-extrabold leading-tight">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-lg bg-white p-2 shadow-sm">
            <div className="mb-1 flex items-center justify-between text-[9px] font-semibold"><span>Vendas/dia do nicho</span><span className="text-[#16a050]">+38%</span></div>
            <svg viewBox="0 0 300 80" className="h-16 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mk-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#18c8e8" stopOpacity=".45" /><stop offset="1" stopColor="#18c8e8" stopOpacity="0" /></linearGradient>
              </defs>
              <path d={a.fill} fill="url(#mk-a)" />
              <path d={a.line} fill="none" stroke="#1565ff" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="mt-2 space-y-1 rounded-lg bg-white p-2 shadow-sm">
            {[["Garrafa térmica 1L", "82", "bg-[#16a050]/10 text-[#12894c]", "Testar"], ["Organizador de gaveta", "74", "bg-[#1565ff]/10 text-[#1565ff]", "Monitorar"], ["Luminária LED", "51", "bg-amber-500/10 text-amber-700", "Monitorar"]].map(([n, s, c, r]) => (
              <div key={n} className="flex items-center gap-2 text-[9px]">
                <span className="flex-1 truncate font-medium">{n}</span>
                <span className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-gradient-to-r from-[#1565ff] to-[#3ddc84]" style={{ width: `${s}%` }} /></span>
                <span className="w-4 font-bold">{s}</span>
                <Pill c={c}>{r}</Pill>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function TrendMock() {
  const up = area([5, 6, 6, 8, 9, 12, 15, 19, 24, 30], 260, 90);
  const flat = area([14, 15, 13, 15, 14, 14, 15, 13, 14, 14], 260, 90);
  return (
    <Frame url="…/tendencias">
      <div className="bg-[#eef3fb] p-3 text-slate-800">
        <div className="mb-2 flex flex-wrap gap-1">
          <Pill c="bg-violet-500/10 text-violet-700">Explosivo</Pill>
          <Pill c="bg-[#16a050]/10 text-[#12894c]">Crescendo</Pill>
          <Pill c="bg-[#1565ff]/10 text-[#1565ff]">Estável</Pill>
          <Pill c="bg-amber-500/10 text-amber-700">Saturado</Pill>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <svg viewBox="0 0 260 90" className="h-28 w-full" preserveAspectRatio="none">
            {[20, 45, 70].map((y) => <line key={y} x1="0" x2="260" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />)}
            <path d={flat.line} fill="none" stroke="#94a3b8" strokeWidth="2" />
            <path d={up.line} fill="none" stroke="#7c3aed" strokeWidth="2.5" />
          </svg>
          <div className="mt-1 flex justify-between text-[9px] text-slate-500"><span>● crescimento 7d / 30d</span><span className="font-bold text-violet-700">aceleração</span></div>
        </div>
      </div>
    </Frame>
  );
}

export function SalesMock() {
  const bars = [42, 55, 48, 63, 71, 66, 80];
  return (
    <Frame url="…/vendas">
      <div className="bg-[#eef3fb] p-3 text-slate-800">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white p-2 shadow-sm"><div className="text-[8px] text-slate-500">Faturamento</div><div className="text-sm font-extrabold text-[#1565ff]">R$ 18,4 mil</div></div>
          <div className="rounded-lg bg-white p-2 shadow-sm"><div className="text-[8px] text-slate-500">Lucro estimado</div><div className="text-sm font-extrabold text-[#12894c]">R$ 4,1 mil</div></div>
        </div>
        <div className="mt-2 flex h-24 items-end gap-1.5 rounded-lg bg-white p-2 shadow-sm">
          {bars.map((b, i) => (
            <div key={i} className="flex flex-1 flex-col justify-end gap-0.5" style={{ height: "100%" }}>
              <div className="rounded-t bg-gradient-to-t from-[#1565ff] to-[#18c8e8]" style={{ height: `${b}%` }} />
              <div className="rounded-t bg-[#3ddc84]" style={{ height: `${b * 0.25}%` }} />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function CalcMock() {
  return (
    <Frame url="…/calculadora">
      <div className="space-y-1.5 bg-[#eef3fb] p-3 text-[10px] text-slate-700">
        {[["Preço de venda", "R$ 59,90", ""], ["Comissão 20%", "− R$ 11,98", "text-red-600"], ["Tarifa fixa", "− R$ 4,50", "text-red-600"], ["Produto + embalagem", "− R$ 23,20", "text-red-600"], ["Imposto (Simples)", "− R$ 3,59", "text-red-600"]].map(([l, v, c]) => (
          <div key={l} className="flex justify-between rounded-md bg-white px-2 py-1 shadow-sm"><span>{l}</span><b className={c}>{v}</b></div>
        ))}
        <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-[#12894c] to-[#22c55e] px-2 py-2 text-white">
          <span className="font-semibold">Lucro por venda</span>
          <span className="flex items-center gap-1 text-sm font-extrabold"><TrendingUp size={12} /> R$ 16,63</span>
        </div>
      </div>
    </Frame>
  );
}
