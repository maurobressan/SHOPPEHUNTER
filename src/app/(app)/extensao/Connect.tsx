"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PlugZap } from "lucide-react";
import { connectExtension } from "@/app/actions/account";
import { btnPrimary, btnGhost, Notice } from "@/components/ui";

type Status = "verificando" | "ausente" | "instalada" | "conectada";

// Conversa com a extensão por window.postMessage (o script dela roda só nas páginas deste site).
export function Connect({ allowed, installUrl }: { allowed: boolean; installUrl: string | null }) {
  const [status, setStatus] = useState<Status>("verificando");
  const [version, setVersion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || e.origin !== location.origin || e.data?.source !== "shoppe-hunter-ext") return;
      setVersion(e.data.version ?? "");
      if (e.data.type === "connected") setStatus("conectada");
      else if (e.data.type === "status") setStatus(e.data.connected ? "conectada" : "instalada");
    };
    window.addEventListener("message", onMsg);
    window.postMessage({ source: "shoppe-hunter-site", type: "ping" }, location.origin);
    const t = setTimeout(() => setStatus((s) => (s === "verificando" ? "ausente" : s)), 1500);
    return () => {
      window.removeEventListener("message", onMsg);
      clearTimeout(t);
    };
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    const r = await connectExtension();
    if (r.token) window.postMessage({ source: "shoppe-hunter-site", type: "connect", token: r.token }, location.origin);
    else setError(r.error ?? "Não foi possível conectar.");
    setBusy(false);
  }

  const step = (n: number, done: boolean, title: string, body: React.ReactNode) => (
    <li className={`flex gap-4 rounded-2xl border p-5 ${done ? "border-ok/30 bg-ok/[0.05]" : "border-line bg-panel"}`}>
      {done ? <CheckCircle2 className="mt-0.5 shrink-0 text-ok" size={26} /> : <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-brand-blue text-sm font-bold text-white">{n}</span>}
      <div className="min-w-0 flex-1">
        <div className="font-bold text-ink">{title}</div>
        <div className="mt-1 text-sm text-mute">{body}</div>
      </div>
    </li>
  );

  const installed = status === "instalada" || status === "conectada";
  return (
    <ol className="space-y-3">
      {step(
        1,
        installed,
        installed ? `Extensão instalada${version ? ` (versão ${version})` : ""}` : "Instale a extensão no Chrome",
        status === "verificando" ? (
          <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> procurando a extensão neste navegador…</span>
        ) : installed ? (
          "Tudo certo neste navegador."
        ) : installUrl ? (
          <>
            <a href={installUrl} target="_blank" rel="noreferrer" className={`${btnPrimary} mt-2`}>Instalar pela Chrome Web Store</a>
            <span className="mt-2 block text-xs">Depois de instalar, volte a esta página.</span>
          </>
        ) : (
          <>
            Enquanto a extensão não está na Chrome Web Store, a instalação é manual:
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li><a href="/shoppe-hunter-extensao.zip" download className="font-semibold text-brand-blue hover:underline">Baixe o arquivo .zip</a> e descompacte numa pasta.</li>
              <li>Abra <code>chrome://extensions</code> e ative o <b>Modo do desenvolvedor</b>.</li>
              <li>Clique em <b>Carregar sem compactação</b>, escolha a pasta e recarregue esta página.</li>
            </ol>
          </>
        ),
      )}
      {step(
        2,
        status === "conectada",
        status === "conectada" ? "Conectada à sua conta" : "Conecte à sua conta",
        status === "conectada" ? (
          "A extensão já salva os anúncios na sua conta. Se trocar de conta, clique em conectar de novo."
        ) : !allowed ? (
          <Notice tone="amber">A extensão faz parte dos planos pagos. <a href="/assinatura" className="font-semibold underline">Ver planos</a></Notice>
        ) : (
          <>
            Um clique e pronto, sem copiar código.
            <div className="mt-3">
              <button onClick={connect} disabled={!installed || busy} className={btnPrimary}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <PlugZap size={16} />} Conectar extensão
              </button>
            </div>
            {error && <div className="mt-3"><Notice tone="red">{error}</Notice></div>}
          </>
        ),
      )}
      {step(
        3,
        false,
        "Use na Shopee",
        <>
          Entre na Shopee com a sua conta e faça uma busca. Cada anúncio ganha um selo com os vendidos, e o painel no canto mostra os mais vendidos, o preço mediano e o botão para salvar todos.
          <div className="mt-3"><a href="https://shopee.com.br" target="_blank" rel="noreferrer" className={btnGhost}>Abrir a Shopee</a></div>
        </>,
      )}
    </ol>
  );
}
