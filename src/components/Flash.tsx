import { Notice } from "./ui";

export type SP = Record<string, string | string[] | undefined>;

export function Flash({ sp }: { sp: SP }) {
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const erro = typeof sp.erro === "string" ? sp.erro : null;
  if (!ok && !erro) return null;
  return (
    <div className="mb-5 space-y-2">
      {ok && <Notice tone="green">{ok}</Notice>}
      {erro && <Notice tone="red">{erro}</Notice>}
    </div>
  );
}
