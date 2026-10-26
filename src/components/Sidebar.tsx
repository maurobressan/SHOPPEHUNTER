"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Search, Trophy, Radar, Swords, Truck, Calculator, Bookmark, Bot, Settings, FileSpreadsheet, Menu, X, Bell, GitCompare, CreditCard, UserCircle, Shield, LogOut, ChevronDown, Sparkles, FileUp,
} from "lucide-react";
import { signOut, switchAccount } from "@/app/actions/auth";
import { Logo } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

type Item = { href: string; label: string; icon: typeof Bell; hint: string };

// Menu organizado pela ordem do trabalho do vendedor: descobrir → analisar → acompanhar a própria loja.
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "", items: [{ href: "/painel", label: "Visão geral", icon: LayoutDashboard, hint: "Resumo do dia" }] },
  {
    title: "Descobrir",
    items: [
      { href: "/explorar", label: "Explorar produtos", icon: Search, hint: "Pesquise anúncios" },
      { href: "/campeoes", label: "Produtos campeões", icon: Trophy, hint: "Ranking Hunter Score" },
      { href: "/tendencias", label: "Radar de tendências", icon: Radar, hint: "O que está subindo" },
    ],
  },
  {
    title: "Analisar",
    items: [
      { href: "/calculadora", label: "Calculadora de lucro", icon: Calculator, hint: "Taxas oficiais" },
      { href: "/concorrencia", label: "Concorrência", icon: Swords, hint: "Preços e saturação" },
      { href: "/fornecedores", label: "Fornecedores", icon: Truck, hint: "Cotações e custo" },
      { href: "/comparar", label: "Comparar produtos", icon: GitCompare, hint: "Lado a lado" },
    ],
  },
  {
    title: "Minha loja",
    items: [
      { href: "/meus-produtos", label: "Meus produtos", icon: Bookmark, hint: "Produtos monitorados" },
      { href: "/vendas", label: "Vendas e planilha", icon: FileSpreadsheet, hint: "Importar planilha da Shopee" },
      { href: "/alertas", label: "Alertas", icon: Bell, hint: "Preço e margem" },
      { href: "/assistente", label: "Assistente IA", icon: Bot, hint: "Relatórios" },
    ],
  },
];

const ACCOUNT_ITEMS: Item[] = [
  { href: "/configuracoes", label: "Configurações", icon: Settings, hint: "Impostos e custos" },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard, hint: "Plano e pagamento" },
  { href: "/conta", label: "Minha conta", icon: UserCircle, hint: "Equipe e extensão" },
];

const ALL = [...GROUPS.flatMap((g) => g.items), ...ACCOUNT_ITEMS, { href: "/admin", label: "Administração", icon: Shield, hint: "" }];

const isActive = (path: string, href: string) => path.startsWith(href) || (href === "/meus-produtos" && path.startsWith("/produtos"));

export function Sidebar(props: {
  demo: boolean;
  unread: number;
  user: { name: string; email: string; isAdmin: boolean };
  account: { id: string; name: string; plan: string };
  accounts: { id: string; name: string }[];
  trialLeft: number | null;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const current = ALL.find((i) => isActive(path, i.href));

  const link = ({ href, label, icon: Icon }: Item, badge?: number) => {
    const active = isActive(path, href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition ${
          active ? "bg-white/[0.12] text-white" : "text-white/65 hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-[#18c8e8] to-[#3ddc84]" />}
        <Icon size={18} className={active ? "text-[#5fe0f5]" : "text-white/50 group-hover:text-white/80"} />
        <span className="flex-1">{label}</span>
        {!!badge && <span className="rounded-full bg-[#3ddc84] px-1.5 text-[11px] font-bold text-[#0b1e4f]">{badge}</span>}
      </Link>
    );
  };

  return (
    <>
      <aside
        className={`side-scroll fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col overflow-y-auto bg-side px-3 pb-4 pt-5 text-white shadow-2xl transition lg:translate-x-0 lg:shadow-none print:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-5 flex items-center justify-between px-2">
          <Link href="/painel" onClick={() => setOpen(false)}>
            <Logo dark size={38} />
          </Link>
          <button aria-label="Fechar menu" onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/60 hover:text-white lg:hidden">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-white/[0.06] p-2.5">
          {props.accounts.length > 1 ? (
            <form action={switchAccount}>
              <label className="block px-1 text-[11px] font-medium text-white/50">Loja / conta</label>
              <select
                name="accountId"
                defaultValue={props.account.id}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="mt-0.5 w-full rounded-lg border-0 bg-transparent px-1 py-0.5 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:text-ink"
              >
                {props.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </form>
          ) : (
            <div className="px-1">
              <div className="text-[11px] font-medium text-white/50">Loja / conta</div>
              <div className="truncate text-sm font-semibold">{props.account.name}</div>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="rounded-full bg-gradient-to-r from-[#1565ff] to-[#18c8e8] px-2 py-0.5 text-[11px] font-bold">Plano {props.account.plan}</span>
            {props.trialLeft !== null && props.trialLeft > 0 && <span className="text-[11px] text-white/60">teste: {props.trialLeft}d</span>}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-4">
          {GROUPS.map((g) => (
            <div key={g.title || "inicio"}>
              {g.title && <div className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/35">{g.title}</div>}
              <div className="flex flex-col gap-0.5">{g.items.map((i) => link(i, i.href === "/alertas" ? props.unread : undefined))}</div>
            </div>
          ))}
          <div>
            <div className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/35">Conta</div>
            <div className="flex flex-col gap-0.5">
              {ACCOUNT_ITEMS.map((i) => link(i))}
              {props.user.isAdmin && link(ALL[ALL.length - 1])}
            </div>
          </div>
        </nav>

        {props.demo ? (
          <Link href="/configuracoes" className="mt-5 block rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-xs leading-relaxed text-amber-100">
            <b className="block text-amber-200">Modo DEMO ativo</b>
            Dados fictícios visíveis. Desative em Configurações.
          </Link>
        ) : (
          props.trialLeft !== null && props.trialLeft > 0 && (
            <Link href="/assinatura" className="mt-5 block rounded-xl bg-gradient-to-br from-[#1565ff] to-[#0aa5c8] p-3 text-xs leading-relaxed">
              <b className="flex items-center gap-1.5 text-sm"><Sparkles size={15} /> Teste grátis</b>
              Faltam {props.trialLeft} dia(s). Assine para manter os recursos.
            </Link>
          )
        )}
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-[#0b1e4f]/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <Topbar
        title={current?.label ?? ""}
        unread={props.unread}
        user={props.user}
        onMenu={() => setOpen(true)}
      />
    </>
  );
}

function Topbar({ title, unread, user, onMenu }: { title: string; unread: number; user: { name: string; email: string }; onMenu: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  const iconBtn = "relative grid h-10 w-10 place-items-center rounded-xl text-mute transition hover:bg-panel2 hover:text-ink";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md lg:pl-64 print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button aria-label="Abrir menu" onClick={onMenu} className={`${iconBtn} lg:hidden`}>
          <Menu size={20} />
        </button>
        <Link href="/painel" className="shrink-0 lg:hidden" aria-label="Início">
          <Image src="/brand/icon.png" alt="Shoppe Hunter" width={34} height={34} />
        </Link>
        <span className="hidden truncate text-sm font-semibold text-ink sm:block lg:hidden">{title}</span>

        <form
          className="ml-auto hidden max-w-md flex-1 sm:block lg:ml-0"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/explorar?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produto, ex.: garrafa térmica"
              className="h-10 w-full rounded-xl border border-line bg-panel pl-9 pr-3 text-sm text-ink shadow-sm placeholder:text-mute/70 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Link href="/vendas#importar" className="mr-1 hidden items-center gap-2 rounded-xl bg-brand-blue/10 px-3 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-blue/15 md:inline-flex">
            <FileUp size={17} /> Importar planilha
          </Link>
          <Link href="/explorar" aria-label="Buscar" className={`${iconBtn} sm:hidden`}><Search size={19} /></Link>
          <ThemeToggle className={iconBtn} />
          <Link href="/alertas" aria-label={`Alertas${unread ? `: ${unread} novos` : ""}`} className={iconBtn}>
            <Bell size={19} />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{unread}</span>}
          </Link>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-panel2" aria-expanded={menu} aria-label="Menu do usuário">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#1565ff] to-[#18c8e8] text-xs font-bold text-white">{initials || "?"}</span>
              <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-ink md:block">{user.name.split(" ")[0]}</span>
              <ChevronDown size={15} className="hidden text-mute md:block" />
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-panel shadow-lift">
                <div className="border-b border-line px-4 py-3">
                  <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
                  <div className="truncate text-xs text-mute">{user.email}</div>
                </div>
                <div className="p-1.5 text-sm">
                  {[["/conta", "Minha conta", UserCircle], ["/assinatura", "Assinatura", CreditCard], ["/configuracoes", "Configurações", Settings]].map(([href, l, I]) => {
                    const Icon = I as typeof Bell;
                    return (
                      <Link key={href as string} href={href as string} onClick={() => setMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-ink hover:bg-panel2">
                        <Icon size={16} className="text-mute" /> {l as string}
                      </Link>
                    );
                  })}
                  <form action={signOut}>
                    <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-bad hover:bg-bad/10">
                      <LogOut size={16} /> Sair
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
