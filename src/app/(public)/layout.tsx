import Link from "next/link";
import { getCtx } from "@/lib/auth";
import { btnPrimary } from "@/components/ui";
import { Logo, BRAND_NAME } from "@/components/Brand";

export const dynamic = "force-dynamic";

// As páginas públicas usam sempre o tema claro, que combina com a logo.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx();
  return (
    <div className="theme-light flex min-h-screen flex-col bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1e4f]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label={BRAND_NAME}>
            <Logo dark size={36} />
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm font-semibold sm:gap-2">
            <Link href="/#recursos" className="hidden rounded-lg px-3 py-2 text-white/70 hover:text-white md:inline">Recursos</Link>
            <Link href="/#como-funciona" className="hidden rounded-lg px-3 py-2 text-white/70 hover:text-white md:inline">Como funciona</Link>
            <Link href="/precos" className="hidden rounded-lg px-3 py-2 text-white/70 hover:text-white sm:inline">Preços</Link>
            {ctx ? (
              <Link href="/painel" className={btnPrimary}>Abrir painel</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-white/70 hover:text-white">Entrar</Link>
                <Link href="/cadastro" className={`${btnPrimary} hidden sm:inline-flex`}>Começar grátis</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/10 bg-[#081633] text-white/70">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo dark size={40} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">Inteligência de produto para quem vende na Shopee: escolha o que vender com base em dados e lucro real.</p>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-bold text-white">Produto</div>
            <ul className="space-y-2">
              <li><Link href="/#recursos" className="hover:text-white">Recursos</Link></li>
              <li><Link href="/precos" className="hover:text-white">Preços</Link></li>
              <li><Link href="/cadastro" className="hover:text-white">Criar conta</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-bold text-white">Legal</div>
            <ul className="space-y-2">
              <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
              <li><Link href="/privacidade" className="hover:text-white">Privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-5 text-xs sm:px-6">
            <span>© {new Date().getFullYear()} {BRAND_NAME}</span>
            <span>Ferramenta independente, sem vínculo com a Shopee.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
