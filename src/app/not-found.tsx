import Link from "next/link";
import { Empty } from "@/components/ui";

export default function NotFound() {
  return (
    <Empty title="Página ou produto não encontrado">
      <Link href="/" className="text-brand-blue">Voltar à Visão Geral</Link>
    </Empty>
  );
}
