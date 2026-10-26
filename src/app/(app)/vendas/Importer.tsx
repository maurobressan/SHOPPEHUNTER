"use client";
import { useActionState, useRef, useState } from "react";
import { importOrders, type PreviewState } from "@/app/actions/app";
import { FIELDS, type FieldKey, type Mapping } from "@/lib/import/orders";
import { FileUp } from "lucide-react";
import { Card, Notice, btnPrimary, btnGhost, input, Table, td } from "@/components/ui";

export function Importer() {
  const [state, action, pending] = useActionState<PreviewState, FormData>(importOrders, {});
  const [mapping, setMapping] = useState<Mapping | null>(null);
  // o formulário é limpo após cada envio; guardamos o arquivo para a etapa de confirmação
  const fileRef = useRef<File | null>(null);
  const [fileName, setFileName] = useState("");
  const map = mapping ?? state.mapping ?? {};

  return (
    <Card title={<span className="flex items-center gap-2"><FileUp size={18} className="text-brand-blue" /> Importar planilha de vendas da Shopee</span>}>
      <ol className="mb-5 grid gap-3 md:grid-cols-3">
        {[
          ["Entre no Centro do Vendedor", "seller.shopee.com.br, com a sua conta da loja."],
          ["Minhas Vendas → Exportar", "Escolha o período e baixe o arquivo .xlsx dos pedidos."],
          ["Envie o arquivo aqui", "O Hunter lê as colunas sozinho; você só confere e confirma."],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-3 rounded-xl bg-panel2/70 p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-blue text-xs font-bold text-white">{i + 1}</span>
            <span><span className="block text-sm font-semibold text-ink">{t}</span><span className="block text-xs text-mute">{d}</span></span>
          </li>
        ))}
      </ol>
      <form
        action={(fd) => {
          if (fileRef.current) fd.set("file", fileRef.current);
          if (mapping) fd.set("mapping", JSON.stringify(mapping));
          return action(fd);
        }}
        className="space-y-4"
      >
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-blue/30 bg-brand-blue/[0.04] px-4 py-8 text-center transition hover:border-brand-blue/60 hover:bg-brand-blue/[0.07]">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#1565ff] to-[#18c8e8] text-white shadow-sm"><FileUp size={22} /></span>
          <span className="text-sm font-semibold text-ink">{fileName ? fileName : "Clique para escolher a planilha"}</span>
          <span className="text-xs text-mute">{fileName ? "clique para trocar o arquivo" : ".xlsx ou .csv exportado do Centro do Vendedor"}</span>
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv,.txt"
            onChange={(e) => {
              fileRef.current = e.target.files?.[0] ?? null;
              setFileName(fileRef.current?.name ?? "");
              setMapping(null);
            }}
            className="sr-only"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button name="step" value="preview" className={state.headers && !state.result ? btnGhost : btnPrimary} disabled={pending || !fileName}>1. Ler e detectar colunas</button>
          {state.headers && !state.result && (
            <button name="step" value="commit" className={btnPrimary} disabled={pending}>2. Confirmar importação</button>
          )}
          {pending && <span className="text-sm text-mute">Processando…</span>}
        </div>
        <p className="text-xs text-mute">Arquivos .xls antigos: abra e salve como .xlsx. Pedidos já importados são ignorados automaticamente, então pode enviar planilhas com períodos repetidos.</p>
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {state.result && (
          <Notice tone="green">
            {state.filename}: {state.result.accepted} linhas importadas · {state.result.duplicates} duplicadas ignoradas · {state.result.rejected} rejeitadas.
            {state.result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-bad">{state.result.errors.map((e) => <li key={e.row}>Linha {e.row}: {e.message}</li>)}</ul>
            )}
          </Notice>
        )}
        {state.headers && (
          <>
            <div className="text-sm text-mute">{state.rowCount} linhas em <b className="text-ink">{state.filename}</b>. Confira o mapeamento (detectado automaticamente) e ajuste se necessário antes de confirmar.</div>
            <div className="grid gap-3 md:grid-cols-4">
              {FIELDS.map((f) => (
                <label key={f.key} className="block text-xs">
                  <span className="mb-1 block text-mute">{f.label}{f.required && <span className="text-bad"> *</span>}</span>
                  <select
                    className={input}
                    value={map[f.key] ?? ""}
                    onChange={(e) => setMapping({ ...map, [f.key as FieldKey]: e.target.value || undefined })}
                  >
                    <option value="">— não usar —</option>
                    {state.headers!.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {state.sample && state.sample.length > 0 && (
              <div>
                <div className="mb-2 text-xs uppercase text-mute">Prévia</div>
                <Table head={state.headers.slice(0, 10)}>
                  {state.sample.map((r, i) => (
                    <tr key={i}>{state.headers!.slice(0, 10).map((h) => <td key={h} className={`${td} text-xs`}>{String(r[h] ?? "")}</td>)}</tr>
                  ))}
                </Table>
              </div>
            )}
          </>
        )}
      </form>
    </Card>
  );
}
