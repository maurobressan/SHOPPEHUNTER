import Link from "next/link";
import { getCtx } from "@/lib/auth";
import { btnPrimary } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-green to-brand-blue font-black text-slate-950">H</div>
            <span className="font-semibold">Shopee Hunter Pro</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/#recursos" className="hidden text-mute hover:text-ink sm:inline">Recursos</Link>
            <Link href="/precos" className="text-mute hover:text-ink">Preços</Link>
            {ctx ? (
              <Link href="/painel" className={btnPrimary}>Abrir painel</Link>
            ) : (
              <>
                <Link href="/login" className="text-mute hover:text-ink">Entrar</Link>
                <Link href="/cadastro" className={btnPrimary}>Começar grátis</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line/60 py-8 text-sm text-mute">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 sm:px-6">
          <span>© {new Date().getFullYear()} Shopee Hunter Pro</span>
          <Link href="/termos" className="hover:text-ink">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
          <span className="w-full text-xs sm:ml-auto sm:w-auto">Ferramenta independente, sem vínculo com a Shopee.</span>
        </div>
      </footer>
    </div>
  );
}
