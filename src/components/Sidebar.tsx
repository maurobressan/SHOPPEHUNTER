"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Search, Trophy, Radar, Swords, Truck, Calculator, Bookmark, Bot, Settings, FileSpreadsheet, Menu, X, Bell, GitCompare, CreditCard, UserCircle, Shield, LogOut,
} from "lucide-react";
import { signOut, switchAccount } from "@/app/actions/auth";

const NAV = [
  { href: "/painel", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/explorar", label: "Explorar Produtos", icon: Search },
  { href: "/campeoes", label: "Produtos Campeões", icon: Trophy },
  { href: "/tendencias", label: "Radar de Tendências", icon: Radar },
  { href: "/concorrencia", label: "Analisar Concorrência", icon: Swords },
  { href: "/fornecedores", label: "Encontrar Fornecedores", icon: Truck },
  { href: "/calculadora", label: "Calculadora Shopee", icon: Calculator },
  { href: "/comparar", label: "Comparar Produtos", icon: GitCompare },
  { href: "/meus-produtos", label: "Meus Produtos", icon: Bookmark },
  { href: "/vendas", label: "Minhas Vendas", icon: FileSpreadsheet },
  { href: "/assistente", label: "Assistente IA", icon: Bot },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar(props: {
  demo: boolean;
  unread: number;
  user: { name: string; email: string; isAdmin: boolean };
  account: { id: string; name: string; plan: string };
  accounts: { id: string; name: string }[];
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const link = (href: string, label: string, Icon: typeof Bell, badge?: number) => {
    const active = path.startsWith(href) || (href === "/meus-produtos" && path.startsWith("/produtos"));
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
          active ? "bg-gradient-to-r from-brand-green/15 to-brand-blue/10 text-ink ring-1 ring-brand-green/30" : "text-mute hover:bg-panel2 hover:text-ink"
        }`}
      >
        <Icon size={17} className={active ? "text-brand-green" : ""} />
        <span className="flex-1">{label}</span>
        {!!badge && <span className="rounded-full bg-brand-green px-1.5 text-[11px] font-semibold text-slate-950">{badge}</span>}
      </Link>
    );
  };
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <button aria-label="Menu" onClick={() => setOpen(!open)} className="text-ink">
          {open ? <X /> : <Menu />}
        </button>
        <span className="font-semibold">Shopee Hunter Pro</span>
        {props.unread > 0 && (
          <Link href="/alertas" className="ml-auto flex items-center gap-1 text-xs text-brand-green">
            <Bell size={15} /> {props.unread}
          </Link>
        )}
      </header>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-line bg-panel/95 p-4 backdrop-blur transition lg:translate-x-0 print:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Link href="/painel" className="mb-4 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-green to-brand-blue text-lg font-black text-slate-950">H</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">Shopee Hunter Pro</div>
            <div className="truncate text-[11px] text-mute">{props.account.name} · {props.account.plan}</div>
          </div>
        </Link>
        <form
          className="mb-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/explorar?q=${encodeURIComponent(q.trim())}`);
            setOpen(false);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca rápida…"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm placeholder:text-mute/60 focus:border-brand-blue focus:outline-none"
          />
        </form>
        <nav className="-mr-2 flex flex-1 flex-col gap-0.5 overflow-y-auto pr-2">
          {NAV.map(({ href, label, icon }) => link(href, label, icon, href === "/alertas" ? props.unread : undefined))}
          <div className="my-2 border-t border-line" />
          {link("/assinatura", "Assinatura", CreditCard)}
          {link("/conta", "Minha conta", UserCircle)}
          {props.user.isAdmin && link("/admin", "Administração", Shield)}
        </nav>
        {props.demo && (
          <Link href="/configuracoes" className="mt-3 block rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-200">
            MODO DEMO ativo: dados fictícios visíveis.
          </Link>
        )}
        <div className="mt-3 border-t border-line pt-3">
          {props.accounts.length > 1 && (
            <form action={switchAccount} className="mb-2">
              <select
                name="accountId"
                defaultValue={props.account.id}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-ink"
              >
                {props.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </form>
          )}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-ink">{props.user.name}</div>
              <div className="truncate text-[11px] text-mute">{props.user.email}</div>
            </div>
            <form action={signOut}>
              <button title="Sair" className="rounded-md p-1.5 text-mute hover:bg-panel2 hover:text-red-300">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
