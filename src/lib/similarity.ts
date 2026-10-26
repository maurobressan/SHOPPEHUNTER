// Detecta anúncios possivelmente do mesmo produto sob títulos diferentes:
// similaridade de Jaccard entre palavras relevantes do título + preços compatíveis.
import { norm } from "./import/orders";

const STOP = new Set(
  "de da do das dos e em para com sem kit novo nova original promocao oferta frete gratis envio imediato pronta entrega a o as os um uma por no na 1 un unid unidade pcs pc".split(" "),
);

export function tokens(title: string): Set<string> {
  return new Set(
    norm(title)
      .split(" ")
      .filter((w) => w.length > 1 && !STOP.has(w))
      .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((x) => b.has(x) && inter++);
  return inter / (a.size + b.size - inter);
}

export function groupSimilar<T extends { id: string; title: string; price: number | null }>(items: T[], threshold = 0.5): T[][] {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const toks = items.map((it) => tokens(it.title));
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const pi = items[i].price;
      const pj = items[j].price;
      const priceOk = !pi || !pj || (Math.max(pi, pj) / Math.min(pi, pj) <= 1.67);
      if (priceOk && jaccard(toks[i], toks[j]) >= threshold) parent[find(i)] = find(j);
    }
  const groups = new Map<number, T[]>();
  items.forEach((it, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), it]));
  return [...groups.values()].sort((a, b) => b.length - a.length);
}
