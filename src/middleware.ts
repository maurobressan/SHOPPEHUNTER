// Barreira rápida: sem cookie de sessão, áreas do app redirecionam ao login.
// A validação real (sessão válida + conta) acontece em requireCtx() no servidor.
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/painel", "/explorar", "/campeoes", "/tendencias", "/concorrencia", "/fornecedores", "/calculadora", "/comparar",
  "/meus-produtos", "/produtos", "/vendas", "/assistente", "/alertas", "/configuracoes", "/conta", "/assinatura", "/admin", "/extensao", "/vale-a-pena", "/estoque",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !req.cookies.get("shp_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?next=" + encodeURIComponent(pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|favicon.ico).*)"] };
