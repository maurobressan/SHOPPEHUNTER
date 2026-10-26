import type { ReactNode } from "react";

// Renderizador mínimo e seguro (sem HTML bruto): títulos, listas, citações, negrito, links.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith("**") ? <b key={k++}>{t.slice(2, -2)}</b> : <a key={k++} href={t} target="_blank" rel="noreferrer">{t}</a>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^\s*[-*•]\s+/.test(line)) { list.push(line.replace(/^\s*[-*•]\s+/, "")); continue; }
    flush();
    if (!line.trim()) continue;
    if (line.startsWith("### ")) blocks.push(<h2 key={blocks.length}>{inline(line.slice(4))}</h2>);
    else if (line.startsWith("## ")) blocks.push(<h2 key={blocks.length}>{inline(line.slice(3))}</h2>);
    else if (line.startsWith("# ")) blocks.push(<h1 key={blocks.length}>{inline(line.slice(2))}</h1>);
    else if (line.startsWith("> ")) blocks.push(<blockquote key={blocks.length}>{inline(line.slice(2))}</blockquote>);
    else if (/^-{3,}$/.test(line)) blocks.push(<hr key={blocks.length} />);
    else blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="md space-y-1">{blocks}</div>;
}
