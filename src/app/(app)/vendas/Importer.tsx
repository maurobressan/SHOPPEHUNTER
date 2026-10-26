"use client";
import { useActionState, useRef, useState } from "react";
import { importOrders, type PreviewState } from "@/app/actions/app";
import { FIELDS, type FieldKey, type Mapping } from "@/lib/import/orders";
import { Card, Notice, btnPrimary, btnGhost, input, Table, td } from "@/components/ui";

export function Importer() {
  const [state, action, pending] = useActionState<PreviewState, FormData>(importOrders, {});
  const [mapping, setMapping] = useState<Mapping | null>(null);
  // o formulário é limpo após cada envio; guardamos o arquivo para a etapa de confirmação
  const fileRef = useRef<File | null>(null);
  const [fileName, setFileName] = useState("");
  const map = mapping ?? state.mapping ?? {};

  return (
    <Card title="Importar planilha do Centro do Vendedor">
      <form
        action={(fd) => {
          if (fileRef.current) fd.set("file", fileRef.current);
          if (mapping) fd.set("mapping", JSON.stringify(mapping));
          return action(fd);
        }}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv,.txt"
            onChange={(e) => {
              fileRef.current = e.target.files?.[0] ?? null;
              setFileName(fileRef.current?.name ?? "");
              setMapping(null);
            }}
            className="text-sm text-mute file:mr-3 file:rounded-lg file:border-0 file:bg-panel2 file:px-3 file:py-2 file:text-ink"
          />
          {fileName && <span className="text-xs text-mute">selecionado: {fileName}</span>}
          <button name="step" value="preview" className={btnGhost} disabled={pending}>1. Ler e detectar colunas</button>
          {state.headers && !state.result && (
            <button name="step" value="commit" className={btnPrimary} disabled={pending}>2. Confirmar importação</button>
          )}
          {pending && <span className="text-sm text-mute">Processando…</span>}
        </div>
        <p className="text-xs text-mute">Centro do Vendedor → Minhas Vendas → Exportar (.xlsx). Também aceita CSV. Arquivos .xls antigos: salve como .xlsx. Pedidos já importados são ignorados automaticamente (controle de duplicidade).</p>
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {state.result && (
          <Notice tone="green">
            {state.filename}: {state.result.accepted} linhas importadas · {state.result.duplicates} duplicadas ignoradas · {state.result.rejected} rejeitadas.
            {state.result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-red-200">{state.result.errors.map((e) => <li key={e.row}>Linha {e.row}: {e.message}</li>)}</ul>
            )}
          </Notice>
        )}
        {state.headers && (
          <>
            <div className="text-sm text-mute">{state.rowCount} linhas em <b className="text-ink">{state.filename}</b>. Confira o mapeamento (detectado automaticamente) e ajuste se necessário antes de confirmar.</div>
            <div className="grid gap-3 md:grid-cols-4">
              {FIELDS.map((f) => (
                <label key={f.key} className="block text-xs">
                  <span className="mb-1 block text-mute">{f.label}{f.required && <span className="text-red-400"> *</span>}</span>
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
