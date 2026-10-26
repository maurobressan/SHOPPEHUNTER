import { redirect } from "next/navigation";
import { parseMoney } from "./import/orders";

export const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const n = (f: FormData, k: string) => parseMoney(s(f, k));
export const back = (path: string, kind: "ok" | "erro", msg: string): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
// Só aceita caminhos internos para evitar redirecionamento aberto.
export const ret = (f: FormData, def: string) => {
  const v = s(f, "_back");
  return v.startsWith("/") && !v.startsWith("//") ? v : def;
};
