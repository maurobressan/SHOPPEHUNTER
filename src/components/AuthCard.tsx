import Image from "next/image";
import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative px-4 py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_50%_0%,rgba(24,200,232,0.14),transparent_65%)]" />
      <div className="relative mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-line bg-white p-7 shadow-lift sm:p-8">
          <Image src="/brand/icon.png" alt="" width={52} height={52} className="mb-4" />
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-mute">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
