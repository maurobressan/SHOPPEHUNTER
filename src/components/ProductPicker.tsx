"use client";
import { useRouter } from "next/navigation";

export function ProductPicker({ products, current, base }: { products: { id: string; name: string }[]; current?: string; base: string }) {
  const router = useRouter();
  return (
    <select
      value={current ?? ""}
      onChange={(e) => router.push(`${base}${base.includes("?") ? "&" : "?"}p=${e.target.value}`)}
      className="min-w-64 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-brand-blue focus:outline-none"
    >
      <option value="" disabled>Selecione um produto…</option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}
