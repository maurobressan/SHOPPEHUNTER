import Image from "next/image";

export const BRAND_NAME = "Shoppe Hunter";

/** Ícone da marca + nome. `dark` para fundos escuros (barra lateral). */
export function Logo({ dark = false, size = 36, sub }: { dark?: boolean; size?: number; sub?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/brand/icon.png" alt="" width={size} height={size} priority className="shrink-0" />
      <span className="min-w-0 leading-none">
        <span className="block whitespace-nowrap font-brand text-[1.2rem] font-black tracking-tight">
          <span className={dark ? "text-white" : "text-brand-navy"}>Shoppe</span>
          <span className="brand-gradient-text">Hunter</span>
        </span>
        {sub && <span className={`mt-1 block truncate text-[11px] font-medium ${dark ? "text-white/55" : "text-mute"}`}>{sub}</span>}
      </span>
    </span>
  );
}
